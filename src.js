//-----TO-DO----------------------
//Add CCW vs CW circle functionality
//create pixel transform (zoom in/out)
//snap to endpoints
//create ability to link
//create ability to move

window.alert("click in the box");
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
canvas.focus();
isDrawing = false;
drawCircle = true;
drawLine = false;
//the coordinate transformation to map from coordinates to pixels (scale and then offset)
windowTransform = {Xscale: 1.0, Yscale: 1.0, Xoffset: 0.0, Yoffset: 0.0}
//line by default

//----------TOOLS-----------------------------------------------------

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
}

function coordToPix(x, y, transform) {
  return [(x*transform.Xscale) + transform.Xoffset, (y*transform.Yscale) + transform.Yoffset];
}

function pixToCoord(x, y, transform) {
  return [(x-transform.Xoffset) / transform.Xscale, (y-transform.Yoffset) / transform.Yscale];

}

function distToCoord(dist, transform) {
  return dist / transform.Xscale;
}

function distToPix(dist, transform) {
  return dist * transform.Xscale;
}

function drawDisplay(ctx, canvas, lines, circles) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (i = 0; i < lines.length; i++) {
      if (lines[i].isFinished) {
        lines[i].draw(ctx);
      }
    }
    for (c = 0; c < circles.length; c++) {
      if(circles[c].isFinished) {
        circles[c].draw(ctx);
      }
    }
}
//---------OBJECTS-------------------------------------------------------

class Line {
  constructor(_x1, _y1, _x2, _y2) {
    this.x1 = _x1;
    this.y1 = _y1;
    this.x2 = _x2;
    this.y2 = _y2;
    this.isFinished = false;
  }
  draw(ctx) {
    // Start a new Path
    var pix1 = coordToPix(this.x1, this.y1, windowTransform);
    var pix2 = coordToPix(this.x2, this.y2, windowTransform);
    ctx.beginPath();
    ctx.moveTo(pix1[0], pix1[1]);
    ctx.lineTo(pix2[0], pix2[1]);

    // Draw the Path
    ctx.stroke();
  }
}
class Circle {
  constructor(_x, _y, _r, _d1, _d2) {
    this.x = _x;
    this.y = _y;
    this.r = _r;
    this.d1 = _d1;
    this.d2 = _d2;
    this.radSet = false;
    this.isFinished = false;
  }
  draw(ctx) {
    // Start a new Path
    var pix = coordToPix(this.x, this.y, windowTransform);
    var _x = pix[0];
    var _y = pix[1];
    var _r = distToPix(this.r, windowTransform);
    if (this.radSet) {
      ctx.beginPath();
      ctx.arc(_x, _y, _r, this.d1, this.d2);

      // Draw the Path
      ctx.stroke();
    } else {
      //if the radius is not yet set, just draw a point where the center was chosen
      ctx.fillRect(_x-1,_y-1,3,3)
    }
  }
}

lines = [];
circles = [];

//assume just line tool for now
canvas.addEventListener("click", function(event) {
  const coord = pixToCoord(event.offsetX, event.offsetY, windowTransform);
  x = coord[0];
  y = coord[1];

  if (drawLine && !isDrawing) {
    l = new Line(x,y,x,y);
    lines.push(l);
    isDrawing = true;
  } else if (drawLine && isDrawing) {
    lines[lines.length-1].isFinished = true;
    isDrawing = false;
  }
  if (drawCircle) {
    if (circles.length == 0) {
      c = new Circle(x,y,0,0,0);
      circles.push(c);
      isDrawing = true;
    } else if (circles[circles.length-1].isFinished == true) {
      c = new Circle(x,y,0,0,0);
      circles.push(c);
      isDrawing = true;
    } else if (circles[circles.length-1].isFinished == false && circles[circles.length-1].radSet == true) {
      circles[circles.length-1].isFinished = true;
      isDrawing = false;
    } else {
      if(isDrawing) {
        //if not, then we need to set the radius of the most recent circle.
        c = circles[circles.length-1];
        c.r = dist(x, y, c.x, c.y);
        c.d1 = Math.atan((y-c.y)/(x-c.x));
        if (x-c.x < 0) {
          c.d1 += Math.PI;
        }
        c.d2 = c.d1;
        c.radSet = true;
      }
    }
  }

});

canvas.addEventListener("mousemove", function(event) {
  const coord = pixToCoord(event.offsetX, event.offsetY, windowTransform);
  x = coord[0];
  y = coord[1];
  if (isDrawing) {
    
    drawDisplay(ctx, canvas, lines, circles);
    if (drawLine) {
      l = lines[lines.length-1];
      l.x2 = x;
      l.y2 = y;
      l.draw(ctx);
    } else if (drawCircle) {
      c = circles[circles.length-1];
      if (c.radSet) {
        //if radius is set, then move around the arc lengths
        c.d2 = Math.atan((y-c.y)/(x-c.x));
        if (x-c.x < 0) {
          c.d2 += Math.PI;
        }
      }
      c.draw(ctx);
    }
  }



});

canvas.addEventListener("keydown", function(event) {
  const key = event.key;
  if (key==="c") {
    drawCircle = true;
    drawLine = false;
    isDrawing = false;
    //also interrupt whatever is in progress
    if (lines.length > 0) {
      if (lines[lines.length-1].isFinished == false) {
        lines.pop()
      }
    }
    if (circles.length > 0) {
      if (circles[circles.length-1].isFinished == false) {
        circles.pop()
      }
    }
  }
  else if (key==="l") {
    drawCircle = false;
    drawLine = true;
    isDrawing = false;
    //also interrupt whatever is in progress
    if (lines.length > 0) {
      if (lines[lines.length-1].isFinished == false) {
        lines.pop();
      }
    }
    if (circles.length > 0) {
      if (circles[circles.length-1].isFinished == false) {
        circles.pop();
      }
    }
  }
  else if (key === "a"){
    //zoom in
    windowTransform.Xscale *= 1.1;
    windowTransform.Yscale *= 1.1;
    drawDisplay(ctx, canvas, lines, circles);
  }
  else if (key === "s") {
    //zoom out
    windowTransform.Xscale /= 1.1;
    windowTransform.Yscale /= 1.1;
    drawDisplay(ctx, canvas, lines, circles);
  }
});