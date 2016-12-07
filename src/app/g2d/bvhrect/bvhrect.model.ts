import { Rect } from '../util/rect';

const minDimension:number = 4;

export class BVHRect extends Rect {

  private _children:BVHRect[] = [];
  private _stroke:string = "#FFF";
  private _fill:string = "#CCC";

  constructor(x:number=0, y:number=0, w:number=0, h:number=0) {
    super(x,y,w,h);
  }

  get stroke():string {
    return this._stroke;
  }

  set stroke(stroke:string) {
    this._stroke = stroke;
  }

  get fill():string {
    return this._fill;
  }

  set fill(fill:string) {
    this._fill = fill;
  }

  addChild(child:BVHRect) {
    this._children.push(child);
  }

  allChildren(cfunc:(rchild:BVHRect) => any) {
    this._children.forEach(child => cfunc(child) )
  }

  static rand(min:number, max:number) { // Inclusive integer [min, nax]
    min = Math.ceil(min);
    max = Math.floor(max);
    if (min === max) {
      return min;
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static colorRand(offset:number=32, opacity:number=1.0):string {
    let [r,g,b] = [BVHRect.rand(offset,255),
                   BVHRect.rand(offset,255),
                   BVHRect.rand(offset,255)];
    return "rgba(" + r + "," + g + "," + b + "," + opacity + ")";
  }

  createRandom():BVHRect {
    let [rw,rh] = [ BVHRect.rand(0, this.w - 1), BVHRect.rand(0, this.h - 1)]
    let [rx,ry] = [ (this.w - 1 - rw) / 2, (this.h - 1 - rh) / 2 ]
    return new BVHRect(rx,ry,rw,rh).randomStroke().randomFill();
  }

  randomStroke():BVHRect {
    this._stroke = BVHRect.colorRand();
    return this;
  }

  randomFill():BVHRect {
    this._fill = BVHRect.colorRand();
    return this;
  }

  renderRect(ctx:CanvasRenderingContext2D, xoff:number=0, yoff:number=0):void {
    ctx.fillStyle = this._fill;
    ctx.strokeStyle = this._stroke;
    ctx.fillRect(xoff + this.x, yoff + this.y, this.w, this.h);
    ctx.strokeRect(xoff + this.x, yoff + this.y, this.w, this.h);
  }

  renderChildren(ctx:CanvasRenderingContext2D, xoff:number=0, yoff:number=0) {
    this.allChildren(child => {
      child.renderRect(ctx, xoff + this.x, yoff + this.y)
    });
  }

  countChildren():number {
    let acc:number = this._children.length;
    this.allChildren(child => acc += child.countChildren());
    return acc;
  }

  splitRandom(ctx:CanvasRenderingContext2D, xoff:number=0, yoff:number=0):boolean {
    const [splitMin, splitMax] = [0.25, 0.75]; // Minimum/Maximum split are 25%/75% of width and height
    let [wmin,hmin] = [this.w * splitMin,
                       this.h * splitMin];
    let [wmax,hmax] = [(this.w-1) * splitMax,
                       (this.h-1) * splitMax];
    let [splitx,splity] = [BVHRect.rand(Math.max(1, wmin), wmax),
                           BVHRect.rand(Math.max(1, hmin), hmax)];
    let [xmin,ymin] = [Math.min(splitx,this.w-splitx),Math.min(splity,this.h-splity)];
    if (xmin >= minDimension && ymin >= minDimension) {
      this.addChild(new BVHRect(0,     0     ,splitx-1     ,splity-1).randomStroke().randomFill())
      this.addChild(new BVHRect(splitx,0     ,this.w-splitx,splity-1).randomStroke().randomFill())
      this.addChild(new BVHRect(0     ,splity,splitx-1     ,this.h-splity).randomStroke().randomFill())
      this.addChild(new BVHRect(splitx,splity,this.w-splitx,this.h-splity).randomStroke().randomFill())
      this.renderChildren(ctx,xoff,yoff);
      return true;
    } else {
      return false;
    }
  }

  splitRect(ctx:CanvasRenderingContext2D, xoff:number=0, yoff:number=0):boolean {
    let l = this._children.length;
    if (l == 0) {
      return this.splitRandom(ctx,xoff,yoff);  // Terminal condition.
    } else {
      let i = BVHRect.rand(0,l-1);
      return this._children[i].splitRect(ctx, xoff + this.x, yoff + this.y);
    }
  }

  joinRect(ctx:CanvasRenderingContext2D, xoff:number=0, yoff:number=0):number {
    let childrenRemoved = 0;
    let l = this._children.length;
    if (l > 0) {
      let i = BVHRect.rand(0,l-1);
      childrenRemoved = this._children[i].joinRect(ctx, xoff + this.x, yoff + this.y);
      if (childrenRemoved == 0) {
        let child:BVHRect = this._children.splice(i,1)[0];
        if (this._children.length == 0) {
          this.stroke = "rgba(0,0,0,1)"
          this.renderRect(ctx, xoff, yoff);
        } else {
          child.fill = this.fill;
          child.stroke = "rgba(255,255,255,1)"
          child.renderRect(ctx, xoff + this.x, yoff + this.y);
        }
        childrenRemoved++;
      }
    }
    return childrenRemoved;
  }
}
