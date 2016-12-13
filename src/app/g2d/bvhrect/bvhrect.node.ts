import { Rand } from '../util/rand';
import { BVHRect } from './bvhrect';

const minDimension:number = 4;

export interface BVHRenderer {
   renderRect(node:BVHNode):void;
   renderX(node:BVHNode, fillStyle?:string, strokeStyle?:string):void;
}

export class MaxAreaNode {
  constructor(public area:number, public readonly node:BVHNode, public readonly parent:BVHNode) {}

  toString():string {
    return "{ area:" + this.area + " node:" + this.node + " parent: " + this.parent + "}"
  }
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

  removeAllChildren():void {
    this._children.length = 0;
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

  renderNode(renderer:BVHRenderer):void {
      renderer.renderRect(this);
      this.allChildren(child => child.renderNode(renderer));
  }

  maxAreaChild(level:number=0, parent:BVHNode=null):MaxAreaNode {
    let maxAreaNode:MaxAreaNode = new MaxAreaNode(this.w * this.h, this, parent);
    let maxChildArea:number = -1;
    if (this.size() > 0) {
      this.allChildren(child => {
        let childNode:MaxAreaNode = child.maxAreaChild(level+1,this);
        if (maxChildArea < childNode.area) {
          maxAreaNode = childNode;
          maxChildArea = childNode.area;
        }
      });
    }
    return maxAreaNode;
  }

  splitFixed(renderer:BVHRenderer, maxDepth:number=3):void {
    let c1 = (96 + maxDepth * 32) % 256;
    let c2 = "rgba(" + c1 + "," + c1 + "," + c1 + ",1)"
    renderer.renderX(this, c2);
    let childDepth = maxDepth - 1;
    if (childDepth >= 0) {
      const ratio:number = 0.4;
      let w1 = Math.floor(this.w * ratio);
      let h1 = Math.floor(this.h * ratio);
      this.addChild(new BVHNode(this.x,      this.y,      w1-1,      h1-1));
      this.addChild(new BVHNode(this.x + w1, this.y,      this.w-w1, h1-1));
      this.addChild(new BVHNode(this.x,      this.y + h1, w1-1,      this.h-h1));
      this.addChild(new BVHNode(this.x + w1, this.y + h1, this.w-w1, this.h-h1));
        this.allChildren(child => {
          child.splitFixed(renderer, childDepth);
      });
    }
  }

  splitRandom(renderer:BVHRenderer,strokeColor:string="rgba(255,255,255,1)"):boolean {
    let rv:boolean = false;
    const [splitMin, splitMax] = [0.25, 0.75]; // Minimum/Maximum split are 25%/75% of width and height
    let [wmin,hmin] = [this.w * splitMin,
                       this.h * splitMin];
    let [wmax,hmax] = [(this.w-1) * splitMax,
                       (this.h-1) * splitMax];
    let [w1,splity] = [Rand.rand(Math.max(1, wmin), wmax),
                           Rand.rand(Math.max(1, hmin), hmax)];
    let [xmin,ymin] = [Math.min(w1, this.w-w1),Math.min(splity, this.h-splity)];
    let maxAspectRatio:number = Math.max(w1/splity, splity/w1);
    rv = xmin >= minDimension && ymin >= minDimension && maxAspectRatio < 4;
    if (rv) {
      this.removeAllChildren();
      this.addChild(new BVHNode(this.x,          this.y,          w1-1     , splity-1));
      this.addChild(new BVHNode(this.x + w1, this.y,          this.w-w1, splity-1));
      this.addChild(new BVHNode(this.x,          this.y + splity, w1-1     , this.h-splity));
      this.addChild(new BVHNode(this.x + w1, this.y + splity, this.w-w1, this.h-splity));
      this.allChildren(child => {
        child.stroke = strokeColor;
        child.fill = Rand.colorRand();
      });
      this.allChildren(child => { renderer.renderRect(child); });
    }
    return rv;
  }

  splitNode(renderer:BVHRenderer, strokeColor:string="rgba(255,255,255,1)"):boolean {
    let s = this.size();
    if (s == 0) {
      let rv = this.splitRandom(renderer, strokeColor);  // Terminal condition.
      return rv;
    } else {
      return this.randomChild().splitNode(renderer, strokeColor);
    }
  }

  joinNode(renderer:BVHRenderer, strokeColor:string="rgba(0,0,0,1)"):boolean {
    let childRemoved = false;
    let s = this.size();
    if (s > 0) {
      let child:BVHNode = this.randomChild();
      childRemoved = child.joinNode(renderer, strokeColor);
      if (!childRemoved) {
          this.removeChild(child);
//          this.renderNode(renderer);
          renderer.renderX(child);
          childRemoved = true;
      }
    }
    return childRemoved;
  }

  toString() {
    return "{ rect:" + super.toString() + ", size:" + this.size() + "}";
  }
}
