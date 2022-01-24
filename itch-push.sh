#!/bin/bash
DIR=/home/gaboloth/prj/code/neben/game

echo "cleaning ..." &&
rm -f $DIR/neben-html5.zip &&
echo "making zip archive ..." &&
zip $DIR/neben-html5.zip $DIR/* &&
echo "uploading ..." &&
butler push $DIR/neben-html5.zip kekelp/neben:HTML5 &&
echo "done"
