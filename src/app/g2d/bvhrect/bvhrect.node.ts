import { Rand } from '../util/rand';
import { BVHRect } from './bvhrect';

const minDimension:number = 4;

export interface Renderer {
   render(node:BVHNode):void;
}

export class BVHNode extends BVHRect {

  private _children:BVHNode[] = [];

  constructor(x:number=0, y:number=0, w:number=0, h:number=0) {
    super(x,y,w,h);
  }

  size():number {
    return this._children.length;
  }

  randomChild():BVHNode {
    let s = this.size();
    if (s == 0) {
      throw "Can't select a random child when there are zero children!" + this.toString();
    }
    return this._children[Rand.rand(0,s-1)];
  }

  addChild(child:BVHNode) {
    this._children.push(child);
  }

  removeChild(child:BVHNode):BVHNode {
    let i = this._children.indexOf(child);
    if (i < 0) {
      throw "Unable to find child index for child: " + child;
    }
    this._children.splice(i,1)[0];
    return child;
  }

  randomColors():void {
    this.randomFill();
    this.randomStroke();
  }

  allChildren(cfunc:(rchild:BVHNode) => any) {
    this._children.forEach(child => cfunc(child) )
  }

  randomizeAllChildren():void {
    this.allChildren(child => child.randomColors());
  }

  countChildren():number {
    let acc:number = this.size();
    this.allChildren(child => acc += child.countChildren());
    return acc;
  }

  splitRandom():boolean {
    const [splitMin, splitMax] = [0.25, 0.75]; // Minimum/Maximum split are 25%/75% of width and height
    let [wmin,hmin] = [this.w * splitMin,
                       this.h * splitMin];
    let [wmax,hmax] = [(this.w-1) * splitMax,
                       (this.h-1) * splitMax];
    let [splitx,splity] = [Rand.rand(Math.max(1, wmin), wmax),
                           Rand.rand(Math.max(1, hmin), hmax)];
    let [xmin,ymin] = [Math.min(splitx, this.w-splitx),Math.min(splity, this.h-splity)];
    if (xmin >= minDimension && ymin >= minDimension) {
      this.addChild(new BVHNode(this.x,          this.y,          splitx-1     , splity-1));
      this.addChild(new BVHNode(this.x + splitx, this.y,          this.w-splitx, splity-1));
      this.addChild(new BVHNode(this.x,          this.y + splity, splitx-1     , this.h-splity));
      this.addChild(new BVHNode(this.x + splitx, this.y + splity, this.w-splitx, this.h-splity));
      this.randomizeAllChildren();
      return true;
    } else {
      return false;
    }
  }

  splitNode(renderer:Renderer):boolean {
    let s = this.size();
    if (s == 0) {
      let rv = this.splitRandom();  // Terminal condition.
      if (rv) {
        this.allChildren(child => { renderer.render(child); });
      }
      return rv;
    } else {
      return this.randomChild().splitNode(renderer);
    }
  }

  joinNode(renderer:Renderer):number {
    let childrenRemoved = 0;
    let s = this.size();
    if (s > 0) {
      let child:BVHNode = this.randomChild();
      childrenRemoved = child.joinNode(renderer);
      if (childrenRemoved == 0) {
        if (this.size() == 0) {
          this.stroke = "rgba(0,0,0,1)"
          renderer.render(this);
        } else {
          child.fill = this.fill;
          child.stroke = "rgba(255,255,255,1)"
          renderer.render(child);
        }
        this.removeChild(child);
        childrenRemoved++;
      }
    }
    return childrenRemoved;
  }
}
