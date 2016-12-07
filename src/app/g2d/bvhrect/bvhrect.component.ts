import { Component, OnInit, OnChanges, Input, ViewChild, ElementRef } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { BVHRect } from './bvhrect.model';

@Component({
  selector: 'g2d-bvhrect',
  templateUrl: './bvhrect.component.html',
  styleUrls: ['./bvhrect.component.scss']
})
export class BVHRectComponent implements OnInit,OnChanges {

  static readonly padPercent = 2;
  static readonly padOuter = BVHRectComponent.padPercent / 200;
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

  cr:BVHRect;

  updateSubscription:Subscription;

  constructor() {
  }

  getGC():CanvasRenderingContext2D {
    return this.canvas.nativeElement.getContext("2d");
  }

  ngOnChanges() {
      this.updateClientRect();
  }

  toggleSplit():void {
    this.splitEnable = !this.splitEnable;
  }

  updateClientRect() {
      this.cr = new BVHRect(
          this.graphWidth  * BVHRectComponent.padOuter/2,
          this.graphHeight * BVHRectComponent.padOuter/2,
          this.graphWidth  * BVHRectComponent.padInner,
          this.graphHeight * BVHRectComponent.padInner)
        .randomFill().randomStroke();
      this.cr.floor();
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
      if (this.cr.w > 0) {
        this.baseDelay = this.delayMin + (this.delayMax - this.delayMin) * Math.min(Math.max(0,x/this.cr.w),1);
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
          this.cr.splitRect(this.getGC(), this.cr.x, this.cr.y);
          break;
        case 1:
          this.cr.joinRect(this.getGC(), this.cr.x, this.cr.y);
          break;
      }
    } else if (event.ctrlKey && event.shiftKey) {
      this.updateClientRect();
      this.getGC().clearRect(this.cr.x, this.cr.y, this.cr.w, this.cr.h);
    } else if (!event.shiftKey){
      this.toggleSplit();
    }
  }

  ngOnInit() {
    this.mouseDelay();
    this.startUpdate();
  }

  calculateDelay():number {
    let exponent:number;
    if (this.phase == 1) {
      exponent = this.cr.countChildren();
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
        let cr = this.cr;
        let ctx = this.getGC();
        if (this.splitEnable) {
          switch (this.phase) {
            case 0:
              if (++this.iterations >= BVHRectComponent.maxIterations) {
                this.iterations = 0;
                this.phase = 1;
              } else {
                let splitTries = BVHRectComponent.maxSplitTries;
                while (!cr.splitRect(ctx, cr.x, cr.y) && --splitTries <= 0 );
              }
              break;
            case 1:
              for (let i=0; i<2 && this.phase == 1; i++) {
                if (cr.joinRect(ctx, cr.x, cr.y) == 0) {
                  this.phase = 2;
                }
              }
              break;
            case 2:
              this.splitEnable = false;
              Observable.of(0).delay(1000).subscribe(n => {
                this.phase = 0;
                ctx.clearRect(cr.x, cr.y, cr.w, cr.h);
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
}
