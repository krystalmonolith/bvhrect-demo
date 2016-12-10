import { Component, OnInit, OnChanges, Input, ViewChild, ElementRef } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { BVHNode,BVHRenderer } from './bvhrect.node';

enum Phase {
  PHASE_SPLIT_NODES,
  PHASE_JOIN_NODES,
  PHASE_INTERMISSION
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

  static readonly mouseDebounceMsec = 20;

  static readonly padPercent = 2;
  static readonly padOuter = BVHRectComponent.padPercent / 100 / 2;
  static readonly padInner = 1 - BVHRectComponent.padOuter * 2;

  static readonly maxSplitTries:number = 10;
  static readonly maxJoinTries:number  = 2;

  // dynamic delay
  static readonly delayK1 = 1000/Math.E;
  static readonly delayK2 = 0.025;

  // baseDelay
  static readonly delayMin:number = 1;
  static readonly delayMax:number = 1000;
  static readonly delayIntermission:number = 1000;

  static readonly maxIterations:number = 5000;


  // Update loop state varables
  iterations:number = BVHRectComponent.maxIterations;
  baseDelay:number = BVHRectComponent.delayMin;
  refreshEnable:boolean = true;
  updateSubscription:Subscription;
  phase:number = Phase.PHASE_SPLIT_NODES;

  // Root node of the BVH tree...
  model:BVHNode;

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

  toggleSplit():void {
    this.refreshEnable = !this.refreshEnable;
  }

  updateClientRect() {
      this.model = new BVHNode(
          this.graphWidth  * BVHRectComponent.padOuter,
          this.graphHeight * BVHRectComponent.padOuter,
          this.graphWidth  * BVHRectComponent.padInner,
          this.graphHeight * BVHRectComponent.padInner)

      this.model.floor();

      console.log("GWW:(" + this.graphWidth + "," + this.graphHeight + ")")
      console.log("MODEL: " + this.model)

      this.iterations = 0;
      this.baseDelay = BVHRectComponent.delayMin;
      this.phase = Phase.PHASE_SPLIT_NODES;
  }

  mouseDelay() {
    Observable.fromEvent(this.canvas.nativeElement, 'mousemove')
    .filter((e:MouseEvent, i:number) => { return e.shiftKey && !e.ctrlKey; })
    .debounceTime(BVHRectComponent.mouseDebounceMsec)
    .subscribe((e:MouseEvent) => {
      let x = e.offsetX;
      let y = e.offsetY;
      if (this.model.w > 0) {
        this.baseDelay = BVHRectComponent.delayMin + (BVHRectComponent.delayMax - BVHRectComponent.delayMin) * Math.min(Math.max(0,x/this.model.w),1);
        this.baseDelay = Math.max(1,Math.floor(this.baseDelay))
        this.stopUpdate();
        this.startUpdate();
      }
    });
  }

  canvasClick(event:MouseEvent) {
    if (event.ctrlKey && !event.shiftKey) {
      this.refreshEnable = false;
      switch (this.phase) {
        case Phase.PHASE_SPLIT_NODES:
          this.model.splitNode(this);
          break;
        case Phase.PHASE_JOIN_NODES:
          this.model.joinNode(this);
          break;
      }
    } else if (event.ctrlKey && event.shiftKey) {
      this.updateClientRect();
      this.getGC().clearRect(this.model.x, this.model.y, this.model.w, this.model.h);
    } else if (!event.shiftKey){
      this.toggleSplit();
    }
  }


  calculateDelay():number {
    let exponent:number;
    switch (this.phase) {
      case Phase.PHASE_SPLIT_NODES:
      exponent = this.iterations;
        break;
      case Phase.PHASE_JOIN_NODES:
      exponent = this.model.countChildren();
        break;
      default:
        return this.baseDelay;
    }
    let ddelay = Math.floor(BVHRectComponent.delayK1 * Math.exp(-exponent * BVHRectComponent.delayK2)); // Note the *negative* exponent!
    let cdelay = this.baseDelay + ddelay;
    return cdelay;
  }

  startUpdate() {
    this.updateSubscription = Observable.of(0).delay(this.calculateDelay()).subscribe(
      cnt => {
        if (this.refreshEnable) {
          switch (this.phase) {
            case Phase.PHASE_SPLIT_NODES:
              if (++this.iterations >= BVHRectComponent.maxIterations) {
                this.iterations = 0;
                this.phase = Phase.PHASE_JOIN_NODES;
              } else {
                let splitTries = BVHRectComponent.maxSplitTries;
                while (!this.model.splitNode(this) && --splitTries <= 0 );
              }
              break;
            case Phase.PHASE_JOIN_NODES:
              for (let i=0; i<BVHRectComponent.maxJoinTries && this.phase == 1; i++) {
                if (this.model.joinNode(this) == 0) {
                  this.phase = Phase.PHASE_INTERMISSION;
                }
              }
              break;
            case Phase.PHASE_INTERMISSION:
              this.refreshEnable = false;
              Observable.of(0).delay(BVHRectComponent.delayIntermission).subscribe(n => {
                this.getGC().clearRect(this.model.x, this.model.y, this.model.w, this.model.h);
                this.phase = Phase.PHASE_SPLIT_NODES;
                this.refreshEnable = true;
              });
              break;
            default:
              throw "Illegal phase: " + this.phase;
          }
        }
        // Kick off the next update... recuraively. Seems evil until you remember it exits after calculating/starting next delay and subscribe-ing.
        // Cannot use Observable.interval(ourDelay):
        // Must update ourDelay period each iteration using Observable.of(0).delay(ourDelay).
        this.startUpdate();
      }
    )
  }

  stopUpdate() {
    if (this.updateSubscription != null) {
      this.updateSubscription.unsubscribe();
      this.updateSubscription = null;
    }
  }

  render(rect:BVHNode) {
      let ctx = this.getGC();
      ctx.fillStyle = rect.fill;
      ctx.strokeStyle = rect.stroke;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
}
