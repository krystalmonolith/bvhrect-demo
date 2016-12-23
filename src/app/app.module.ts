import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
//import { FormsModule } from '@angular/forms';
//import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { BVHCanvasComponent } from './bvh-canvas/bvh-canvas.component';

import { G2dModule } from './g2d/g2d.module';

@NgModule({
  declarations: [
    AppComponent,
    BVHCanvasComponent
  ],
  imports: [
    BrowserModule,
//    FormsModule,
//    HttpModule,
    G2dModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
