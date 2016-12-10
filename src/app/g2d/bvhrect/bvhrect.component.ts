import { Component, OnInit, OnChanges, Input, ViewChild, ElementRef } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { BVHNode,Renderer } from './bvhrect.node';

@Component({
  selector: 'g2d-bvhrect',
  templateUrl: './bvhrect.component.html',
  styleUrls: ['./bvhrect.component.scss']
})
export class BVHRectComponent implements OnInit,OnChanges,Renderer {

  static readonly padPercent = 2;
  static readonly padOuter = BVHRectComponent.padPercent / 100 / 2;
  static readonly padInner = 1 - BVHRectComponent.padOuter * 2;

  @ViewChild("canvas") canvas:ElementRef;
  @Input() graphWidth: number = 0;
  @Input() graphHeight:number = 0;

  delayMin:number = 1;
  delayMax:number = 1000;
  baseDelay: number = this.delayMin;

  static readonly maxSplitTries:number = 10;
  static readonly maxIterations:number = 5000;
  iterations:number = BVHRectComponent.maxIterations;
  phase:number = 0;

  splitEnable:boolean = true;

  model:BVHNode;

  updateSubscription:Subscription;

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
    this.splitEnable = !this.splitEnable;
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
      this.phase = 0;
  }

  mouseDelay() {
    Observable.fromEvent(this.canvas.nativeElement, 'mousemove')
    .filter((e:MouseEvent, i:number) => { return e.shiftKey; })
    .debounceTime(20)
    .subscribe((e:MouseEvent) => {
      let x = e.offsetX;
      let y = e.offsetY;
//      console.log("MXY:(" + x + "," + y + ")")
      if (this.model.w > 0) {
        this.baseDelay = this.delayMin + (this.delayMax - this.delayMin) * Math.min(Math.max(0,x/this.model.w),1);
        this.baseDelay = Math.max(1,Math.floor(this.baseDelay))
//        console.log("MOUSEDELAY: " + this.baseDelay);
        this.stopUpdate();
        this.startUpdate();
      }
    });
  }

  canvasClick(event:MouseEvent) {
    if (event.ctrlKey && !event.shiftKey) {
      this.splitEnable = false;
      switch (this.phase) {
        case 0:
          this.model.splitNode(this);
          break;
        case 1:
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
    if (this.phase == 1) {
      exponent = this.model.countChildren();
    } else {
      exponent = this.iterations;
    }
    let ddelay = Math.floor(1000 * Math.exp(-exponent*.025)/Math.E);
    let cdelay = this.baseDelay + ddelay;
//    console.log("CDELAY: " + cdelay + " DDELAY: " + ddelay + " BASEDELAY: " + this.baseDelay + " EXPONENT: " + exponent)
    return cdelay;
  }

  startUpdate() {
    this.updateSubscription = Observable.of(0).delay(this.calculateDelay()).subscribe(
      cnt => {
        if (this.splitEnable) {
          switch (this.phase) {
            case 0:
              if (++this.iterations >= BVHRectComponent.maxIterations) {
                this.iterations = 0;
                this.phase = 1;
              } else {
                let splitTries = BVHRectComponent.maxSplitTries;
                while (!this.model.splitNode(this) && --splitTries <= 0 );
              }
              break;
            case 1:
              for (let i=0; i<2 && this.phase == 1; i++) {
                if (this.model.joinNode(this) == 0) {
                  this.phase = 2;
                }
              }
              break;
            case 2:
              this.splitEnable = false;
              Observable.of(0).delay(1000).subscribe(n => {
                this.phase = 0;
                this.getGC().clearRect(this.model.x, this.model.y, this.model.w, this.model.h);
                this.splitEnable = true;
              });
              break;
            default:
              throw "Illegal phase: " + this.phase;
          }
        }
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
