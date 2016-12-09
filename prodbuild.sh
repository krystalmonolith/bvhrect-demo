#!/bin/bash

TSTAMP=`date +%Y%m%dT%H%M%S%z`
rm -rf dist
ng build --prod --aot --base-href /bvhrect-demo/
pushd dist
tar czvf ../bvhrect-demo-$TSTAMP.tgz .
popd
