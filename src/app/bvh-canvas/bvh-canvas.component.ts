import { Component, OnInit, AfterContentChecked, ElementRef } from '@angular/core';
import { Rect } from '../g2d/util/rect';

@Component({
  selector: 'app-bvh-canvas',
  templateUrl: './bvh-canvas.component.html',
  styleUrls: ['./bvh-canvas.component.sass']
})
export class BVHCanvasComponent implements OnInit, AfterContentChecked {

  private graphLeft: number = 0;
  private graphTop: number = 0;
  private graphWidth: number = 0;
  private graphHeight: number = 0;
  private graphWidthLast: number = -1;

  constructor(private elementRef: ElementRef) { }

  ngOnInit() {
  }

  getElementRect(sourceClassName:string):Rect {
    let elementArray = this.elementRef.nativeElement.getElementsByClassName(sourceClassName);
    /* TODO: Fix possible issue with multiple elements containing class sourceClassName.
    ** Current implementation only handles first element found,
    ** which might not be correct. Possible implementation where passed in
    ** Observable instance is next(elrect) for all elementArray
    ** with a final complete() instead of being singularly return'ed.
    */
    if (elementArray && elementArray.length > 0) {
      let elrect = elementArray[0].getBoundingClientRect();
      if (elrect) {
        return new Rect(elrect.x, elrect.y, elrect.width, elrect.height);
      }
    }
    return new Rect();
  }

  logElementRect(sourceClassName:string, title:string):void {
    title += "|" + sourceClassName + ": ";
    console.log(title + this.getElementRect(sourceClassName));
  }

  setGraphHeight(canvasElement: any) {
    this.updateGraphSize();
  }

  updateGraphSize() {
    let r:Rect = this.getElementRect("bvhrect-div");
    const paddingPercent:number = 4;
    const paddingOuter:number = paddingPercent/100;
    const paddingInner:number = 1-paddingOuter;
    this.graphWidth = r.w * paddingInner;
    this.graphHeight = r.h * paddingInner;
  }

  ngAfterContentChecked() {
    this.updateGraphSize();
  }
}
