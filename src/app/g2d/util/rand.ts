export class Rand {

  constructor() {}

  static rand(min:number, max:number) { // Inclusive integer [min, nax]
    min = Math.ceil(min);
    max = Math.floor(max);
    if (min === max) {
      return min;
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static colorRand(offset:number=32, opacity:number=1.0):string {
    let [r,g,b] = [Rand.rand(offset,255),
                   Rand.rand(offset,255),
                   Rand.rand(offset,255)];
    return "rgba(" + r + "," + g + "," + b + "," + opacity + ")";
  }
}
