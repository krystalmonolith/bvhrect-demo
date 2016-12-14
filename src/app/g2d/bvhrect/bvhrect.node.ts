import { Rand } from '../util/rand';
import { BVHRect } from './bvhrect';

const minDimension:number = 4;

export interface BVHRenderer {
   renderRect(node:BVHNode):void;
   renderX(node:BVHNode, fillStyle?:string, strokeStyle?:string):void;
}

export class MaxAreaNode {
  constructor(public area:number, public readonly node:BVHNode) {}

  toString():string {
    return "{ area:" + this.area + " node:" + this.node + " parent: " + this.node.getParent() + "}"
  }
}

export class BVHNode extends BVHRect {

  private _parent:BVHNode;
  private _children:BVHNode[] = [];
  private static splitRejects:BVHNode[] = [];

  constructor(parent:BVHNode, x:number=0, y:number=0, w:number=0, h:number=0) {
    super(x,y,w,h);
    this._parent = parent;
  }

  getParent():BVHNode {
    return this._parent;
  }

  size():number {
    return this._children.length;
  }

  static resetRejects():void {
    BVHNode.splitRejects.length = 0;
  }

  static addReject(node:BVHNode):void {
    BVHNode.splitRejects.push(node);
  }

  static isReject(node:BVHNode):boolean {
    return BVHNode.splitRejects.indexOf(node) >= 0;
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

  randomColors():BVHNode {
    this.randomFill();
    this.randomStroke();
    return this;
  }

  setFill(fill:string):BVHNode {
    this.fill = fill;
    return this;
  }

  setStroke(stroke:string):BVHNode {
    this.stroke = stroke;
    return this;
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
    let maxAreaNode:MaxAreaNode = new MaxAreaNode(this.w * this.h, this);
    let maxChildArea:number = -1;
    if (this.size() > 0) {
      this.allChildren(child => {
        if (!BVHNode.isReject(child)) {
          let childNode:MaxAreaNode = child.maxAreaChild(level+1,this);
          if (maxChildArea < childNode.area) {
            maxAreaNode = childNode;
            maxChildArea = childNode.area;
          }
        }
      });
    }
    return maxAreaNode;
  }

  splitFixed(renderer:BVHRenderer, maxDepth:number=1):boolean {
    let rv:boolean = false;
    let childDepth = maxDepth - 1;
    if (childDepth >= 0) {
      const ratio:number = 0.5;
      let w1 = Math.floor(this.w * ratio);
      let h1 = Math.floor(this.h * ratio);
      if (w1 >= minDimension && h1 >= minDimension) {
        let w2 = this.w - w1;
        let h2 = this.h - h1;
        if (w1 >= h1) {
          this.addChild(new BVHNode(this, this.x,      this.y,      w1,     this.h).randomColors());
          this.addChild(new BVHNode(this, this.x + w1, this.y,      w2,     this.h).randomColors());
        } else {
          this.addChild(new BVHNode(this, this.x,      this.y,      this.w, h1).randomColors());
          this.addChild(new BVHNode(this, this.x,      this.y + h1, this.w, h2).randomColors());
        }
        this.allChildren(child => {
          renderer.renderRect(child);
          child.splitFixed(renderer, childDepth);
        });
        rv = true;
      }
    }
    return rv;
  }

  splitRandom(renderer:BVHRenderer,strokeColor:string="rgba(255,255,255,1)"):boolean {
    let rv:boolean = false;
    const [splitMin, splitMax] = [0.25, 0.75]; // Minimum/Maximum split are 25%/75% of width and height
    let [wmin,hmin] = [this.w * splitMin,
                       this.h * splitMin];
    let [wmax,hmax] = [(this.w-1) * splitMax,
                       (this.h-1) * splitMax];
    let [splitx,splity] = [Rand.rand(Math.max(1, wmin), wmax),
                       Rand.rand(Math.max(1, hmin), hmax)];
    let [xmin,ymin] = [Math.min(splitx, this.w-splitx),Math.min(splity, this.h-splity)];
    let maxAspectRatio:number = Math.max(splitx/splity, splity/splitx);
    rv = xmin >= minDimension && ymin >= minDimension && maxAspectRatio < 4;
    if (rv) {
      this.removeAllChildren();
      this.addChild(new BVHNode(this, this.x,          this.y,          splitx-1     , splity-1));
      this.addChild(new BVHNode(this, this.x + splitx, this.y,          this.w-splitx, splity-1));
      this.addChild(new BVHNode(this, this.x,          this.y + splity, splitx-1     , this.h-splity));
      this.addChild(new BVHNode(this, this.x + splitx, this.y + splity, this.w-splitx, this.h-splity));
      this.allChildren(child => {
        child.stroke = strokeColor;
        child.fill = Rand.colorRand();
      });
      this.allChildren(child => { renderer.renderRect(child); });
    }
    if (!rv) {
      console.log("SPLITFAIL:" + this + " sxy(" + splitx + "," + splity + ") minxy(" + xmin + "," + ymin + ") ar:" + Math.round(maxAspectRatio * 10)/10)
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
          this.setStroke(strokeColor)
          this.renderNode(renderer);
          childRemoved = true;
      }
    }
    return childRemoved;
  }

  toString() {
    return "{ rect:" + super.toString() + ", size:" + this.size() + "}";
  }
}
