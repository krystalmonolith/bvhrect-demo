import { Component, OnInit, OnChanges, Input, ViewChild, ElementRef } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { Rand } from '../util/rand';
import { BVHNode, BVHRenderer, MaxAreaNode, HitTestResult } from './bvhrect.node';

export enum Phase {
  SplitRandom,
  HuntBiggest,
  JoinRandom,
  INTERMISSION
}

export class SplitBiggestStatus {
  constructor(public readonly split:boolean, public readonly man:MaxAreaNode) {}
  toString():string {
    return "{ split: " + this.split + " " + this.man.node.toString() + "}"
  }
}

@Component({
  selector: 'g2d-bvhrect',
  templateUrl: './bvhrect.component.html',
  styleUrls: ['./bvhrect.component.scss']
})
export class BVHRectComponent implements OnInit,OnChanges,BVHRenderer {

  @ViewChild("canvas") canvas:ElementRef;
  @Input() graphWidth: number = 0;
  @Input() graphHeight:number = 0;

  static readonly mouseDelayDebounceMsec = 20;
  static readonly mousePauseDebounceMsec = 10;
  static readonly hitTestDisplayDuration = 5000;

  static readonly padPercent = 2;
  static readonly padOuter = BVHRectComponent.padPercent / 100 / 2;
  static readonly padInner = 1 - BVHRectComponent.padOuter * 2;

  static readonly statusLineHeight = 20;

  static readonly maxSplitTries:number = 10;
  static readonly maxJoinTries:number  = 2;

  // dynamic delay
  static readonly delayK1 = 1000/Math.E;
  static readonly delayK2 = 0.025;

  // baseDelay
  static readonly delayMin:number = 1;
  static readonly delayMax:number = 1000;
  static readonly delayIntermission:number = 1000;

  static readonly initialNodesPerCycle:number = 2000;
  static readonly danceDelay:number = 60 * 1000;

  // Update loop state varables
  baseDelay:number = BVHRectComponent.delayMin;
  refreshEnable:boolean = true;
  updateSubscription:Subscription;
  danceSubscription:Subscription;
  phase:Phase = Phase.SplitRandom;

  // Root node of the BVH tree...
  model:BVHNode;
  currentNodes:number = 0;
  maxNodes:number = 0;

  // PAUSE mode hit test node or null
  hitTestNode:BVHNode;
  hitTestSubscription:Subscription;

  constructor() {
    this.updateClientRect();
  }

  ngOnInit() {
    this.mouseDelay();
    this.startUpdate();
  }

  ngOnChanges() {
    this.updateClientRect();
  }

  getGC():CanvasRenderingContext2D {
    return this.canvas.nativeElement.getContext("2d");
  }

  toggleRefreshEnable():void {
    this.refreshEnable = !this.refreshEnable;
  }

  updateClientRect() {
      this.model = new BVHNode(
          null,
          this.graphWidth  * BVHRectComponent.padOuter,
          this.graphHeight * BVHRectComponent.padOuter,
          this.graphWidth  * BVHRectComponent.padInner,
          this.graphHeight * BVHRectComponent.padInner - BVHRectComponent.statusLineHeight);
      this.model.floor();
      this.baseDelay = BVHRectComponent.delayMin;
      this.phase = Phase.SplitRandom;
      this.maxNodes = 0;
  }

  mouseCoordinates(e: MouseEvent):number[] {
    let rect = this.canvas.nativeElement.getBoundingClientRect();
    let rv:number[] = [];
    rv.push(Math.floor(e.clientX - rect.left));
    rv.push(Math.floor(e.clientY - rect.top));
    return rv;
  }

  updateHitTest(e:MouseEvent):void {
    let [x,y] = this.mouseCoordinates(e);
    this.hitTestNode = this.model.hitTest(x,y);
    this.updateStatusLine();
    if (this.hitTestSubscription) {
      this.hitTestSubscription.unsubscribe();
    }
    this.hitTestSubscription =
      Observable
        .of(0)
        .delay(BVHRectComponent.hitTestDisplayDuration)
        .subscribe(v => {
          this.hitTestNode = null;
          this.updateStatusLine();
        });
  }

  mouseDelay() {
    Observable.fromEvent(this.canvas.nativeElement, 'mousemove')
    .filter((e:MouseEvent, i:number) => { return e.shiftKey && !e.ctrlKey && this.model && this.model.w > 0; })
    .debounceTime(BVHRectComponent.mouseDelayDebounceMsec)
    .subscribe((e:MouseEvent) => {
      let [x,y] = this.mouseCoordinates(e);
      this.baseDelay = BVHRectComponent.delayMin + (BVHRectComponent.delayMax - BVHRectComponent.delayMin) * Math.min(Math.max(0,x/this.model.w),BVHRectComponent.delayMin);
      this.baseDelay = Math.max(1,Math.floor(this.baseDelay))
      this.stopUpdate();
      this.startUpdate();
    });
    Observable.fromEvent(this.canvas.nativeElement, 'mousemove')
    .filter((e:MouseEvent, i:number) => { return !this.refreshEnable && this.model && this.model.w > 0; })
    .debounceTime(BVHRectComponent.mousePauseDebounceMsec)
    .subscribe((e:MouseEvent) => {
      this.updateHitTest(e);
    });
  }

  canvasClick(event:MouseEvent) {
    if (event.ctrlKey && !event.shiftKey) {
      this.refreshEnable = false;
      switch (this.phase) {
        case Phase.SplitRandom:
          this.model.splitNode(this);
          break;
        case Phase.HuntBiggest:
          this.letsDance();
          break;
        case Phase.JoinRandom:
          this.model.joinNode(this);
          break;
      }
    } else if (event.ctrlKey && event.shiftKey) {
      this.updateClientRect();
      this.getGC().clearRect(this.model.x, this.model.y, this.model.w, this.model.h);
    } else if (!event.shiftKey){
      this.toggleRefreshEnable();
      if (this.refreshEnable) {
        this.hitTestNode = null;
      } else {
        this.updateHitTest(event);
      }
    }
  }

  canvasBlur(event:FocusEvent) {
    this.hitTestNode = null;
    this.refreshEnable = null;
    this.updateStatusLine();
  }

  updateStatusLine():void {
    this.currentNodes = this.model.countChildren();
    let states:string[] = [ Phase[this.phase], this.currentNodes.toString() ];
    if (!this.refreshEnable) {
      states.push("PAUSE");
    }
    if (this.hitTestNode) {
      let hit:HitTestResult = this.hitTestNode.getHit();
      hit.format().forEach(s => states.push(s));
    }
    this.renderStatusLine(states);
  }

  calculateDelay():number {
    let exponent:number;
    switch (this.phase) {
      case Phase.SplitRandom:
      case Phase.JoinRandom:
        exponent = this.currentNodes;
        let ddelay = Math.floor(BVHRectComponent.delayK1 * Math.exp(-exponent * BVHRectComponent.delayK2)); // Note the *negative* exponent!
        let cdelay = this.baseDelay + ddelay;
        return cdelay;
      default:
        return this.baseDelay;
    }
  }

  doUpdate():void {
    let ctx = this.getGC();
    ctx.save();
    if (this.refreshEnable) {
      switch (this.phase) {
        case Phase.SplitRandom:
          if (this.currentNodes >= BVHRectComponent.initialNodesPerCycle) {
            this.phase = Phase.HuntBiggest;
            this.maxNodes = this.currentNodes;
            this.maxNodes = this.currentNodes;
            this.danceSubscription = Observable.of(0).delay(BVHRectComponent.danceDelay).subscribe(
              unused => this.phase = Phase.JoinRandom
            )
          } else {
           this.splitRandom();
          }
          break;
        case Phase.HuntBiggest:
          if (this.currentNodes > 0) {
            this.letsDance();
          } else {
            if (this.danceSubscription != null) {
              this.danceSubscription.unsubscribe();
              this.danceSubscription = null;
            }
            this.phase = Phase.JoinRandom;
          }
          break;
        case Phase.JoinRandom:
          BVHNode.resetRejects();
          this.join();
          break;
        case Phase.INTERMISSION:
          this.refreshEnable = false;
          Observable.of(0).delay(BVHRectComponent.delayIntermission).subscribe(n => {
            ctx.clearRect(this.model.x, this.model.y, this.model.w, this.model.h);
            this.phase = Phase.SplitRandom;
            this.refreshEnable = true;
          });
          break;
        default:
          throw "Illegal phase: " + this.phase;
      } // endswitch (this.phase)
      this.updateStatusLine();
    } // endif refreshEnable

    // Kick off the next update... recursively!
    // Seems evil until you remember it exits after calculating
    // and starting the next delay and subscribe-ing.
    //
    // Cannot use Observable.interval(ourDelay) since it
    // only looks at the ourDelay period value once.
    //
    // We must update ourDelay period value each iteration
    // using Observable.of(0).delay(this.calculateDelay()).
    this.startUpdate();
    ctx.restore();
  }

  startUpdate() {
    this.updateSubscription =
      Observable
      .of(0)
      .delay(this.calculateDelay())
      .subscribe(notused => this.doUpdate());
  }

  stopUpdate() {
    if (this.updateSubscription != null) {
      this.updateSubscription.unsubscribe();
      this.updateSubscription = null;
    }
  }

//  splitRandom(strokeColor:string=Rand.colorRand()):void {
  splitRandom(strokeColor:string="rgba(255,255,255,1)"):void {
    let splitTries = BVHRectComponent.maxSplitTries;
    while (!this.model.splitNode(this, strokeColor) && --splitTries <= 0 );
  }

  splitBiggest(strokeColor:string=Rand.colorRand()):SplitBiggestStatus {
    let maxAreaNode:MaxAreaNode = this.model.maxAreaChild();
    let rv:boolean = maxAreaNode.node.splitRandom(this, strokeColor);
    return new SplitBiggestStatus(rv, maxAreaNode);
  }

  join(strokeColor:string="rgba(0,0,0,1)"):void {
    if (!this.model.joinNode(this, strokeColor)) {
      this.phase = Phase.INTERMISSION;
    }
  }

  letsDance(): void {
    let splitStat:SplitBiggestStatus = this.splitBiggest();
    if (!splitStat.split) {
      let node = splitStat.man.node;
      if (!node.splitFixed(this)) {
        node.randomColors();
        this.renderRect(node);
        BVHNode.addReject(node);
      }
    }
  }

  // Implementation of BVHRenderer.render(rect:BVHNode)
  // All rectangle painting occurs here, controlled by the model.
  renderRect(rect:BVHNode):void {
      let ctx = this.getGC();
      ctx.fillStyle = rect.fill;
      ctx.strokeStyle = rect.stroke;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  renderX(rect:BVHNode, fillStyle:string="#FFFFFF", strokeStyle:string="#000000"):void {
      let ctx = this.getGC();
      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = strokeStyle;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.beginPath();
      ctx.moveTo(rect.x,rect.y);
      ctx.lineTo(rect.x+rect.w-1, rect.y+rect.h-1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rect.x+rect.w-1, rect.y);
      ctx.lineTo(rect.x, rect.y+rect.h-1);
      ctx.stroke();
  }

  renderStatusLine(txt:string[],
                   font:string="16px Courier",
                   fillStyle:string="rgba(255,255,255,1)",
                   strokeStyle:string="rgba(255,255,255,1)",
                   bgStyle:string="rgba(0,0,0,1)",
                   lineWidth:number=0.5):void {
    let ctx = this.getGC();
    ctx.save();
    let spacing = 2;
    let xoff:number = spacing;
    let bgh = BVHRectComponent.statusLineHeight;
    let bgy = Math.floor(this.graphHeight - bgh - spacing);
    ctx.clearRect(0, bgy, this.graphWidth, bgh);
    let y = bgy + 2 * spacing;
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.lineWidth = lineWidth;
    txt.forEach(t => {
      let metrics:TextMetrics = ctx.measureText(t);
      let bgx = this.model.x + xoff;
      let x = bgx + spacing;
      let bgw = metrics.width + spacing * 2;
      let w = metrics.width;
      ctx.fillStyle = bgStyle;
      ctx.fillRect(bgx, bgy, bgw, bgh);
      ctx.fillStyle = fillStyle;
      ctx.fillText(t, x, y);
      ctx.strokeStyle = strokeStyle;
      ctx.strokeText(t, x, y);
      xoff += bgw + spacing * 2;
    });
    ctx.restore();
  }
}
