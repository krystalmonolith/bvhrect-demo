import { Rand } from '../util/rand';
import { Rect } from '../util/rect';

export class BVHRect extends Rect {

  private _stroke:string = "#FFF";
  private _fill:string   = "#CCC";

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

  randomStroke():BVHRect {
    this._stroke = Rand.colorRand();
    return this;
  }

  randomFill():BVHRect {
    this._fill = Rand.colorRand();
    return this;
  }

  createRandom():BVHRect {
    let [rw,rh] = [ Rand.rand(0, this.w - 1), Rand.rand(0, this.h - 1)]
    let [rx,ry] = [ (this.w - 1 - rw) / 2, (this.h - 1 - rh) / 2 ]
    return new BVHRect(rx,ry,rw,rh).randomStroke().randomFill();
  }
}
