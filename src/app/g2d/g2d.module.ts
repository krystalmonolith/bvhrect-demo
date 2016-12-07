import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { G2dComponent } from './g2d.component';
import { BVHRectComponent } from './bvhrect/bvhrect.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [G2dComponent, BVHRectComponent],
  exports: [ BVHRectComponent]
})
export class G2dModule { }
