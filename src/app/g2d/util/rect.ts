// Rectangle Utility class: Coordinate system upper left == (0,0)
// Units are whatever you define them: inches, pixels, parsecs...
// Just be consistent or you'll crash into Mars.
//
// _x - x coordinate left side.
// _y - y coordinate top side.
// _w - width
// _h - height

export class Rect {
  private _x:number;
  private _y:number;
  private _w:number;
  private _h:number;

  constructor(x:number=0, y:number=0, w:number=0, h:number=0) {
    this._x = x;
    this._y = y;
    this._w = w;
    this._h = h;
  }

    get x():number {
      return this._x;
    }
    set x(v:number) {
      this._x = v;
    }

    get y():number {
      return this._y;
    }
    set y(v:number) {
      this._y = v;
    }

    get w():number {
      return this._w;
    }
    set w(v:number) {
      this._w = v;
    }

    get h():number {
      return this._h;
    }
    set h(v:number) {
      this._h = v;
    }

    floor():Rect {
      this._x = Math.floor(this._x);
      this._y = Math.floor(this._y);
      this._w = Math.floor(this._w);
      this._h = Math.floor(this._h);
      return this;
    }

    ceil():Rect {
      this._x = Math.ceil(this._x);
      this._y = Math.ceil(this._y);
      this._w = Math.ceil(this._w);
      this._h = Math.ceil(this._h);
      return this;
    }

    toString():string {
      return "(" + this._x + "," + this._y + "," + this._w + "," + this._h + ")";
    }
}
