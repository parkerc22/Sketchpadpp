window.alert("click in the box");
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
canvas.focus();
isDrawing = false;
drawCircle = true;
drawLine = false;
//line by default

//----------TOOLS-----------------------------------------------------

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
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
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);

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
    if (this.radSet) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, this.d1, this.d2);

      // Draw the Path
      ctx.stroke();
    } else {
      //if the radius is not yet set, just draw a point where the center was chosen
      ctx.fillRect(this.x-1,this.y-1,3,3)
    }
  }
}

lines = [];
circles = [];

//assume just line tool for now
canvas.addEventListener("click", function(event) {
  const x = event.offsetX;
  const y = event.offsetY;
  ctx.beginPath();
  ctx.moveTo(x,y);
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
        c.d1 = Math.asin((y-c.y)/c.r);
        c.d2 = c.d1;
        c.radSet = true;
      }
    }
  }

});

canvas.addEventListener("mousemove", function(event) {
  
  if (isDrawing) {
    
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
    if (drawLine) {
      l = lines[lines.length-1];
      l.x2 = event.offsetX;
      l.y2 = event.offsetY;
      l.draw(ctx);
    } else if (drawCircle) {
      c = circles[circles.length-1];
      if (c.radSet) {
        //if radius is set, then move around the arc lengths
        c.d2 = Math.asin((event.offsetY-c.y)/c.r);
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
});