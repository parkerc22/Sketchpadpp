window.alert("click in the box");
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
isDrawing = false;
class Line {
  constructor(_x1, _y1, _x2, _y2) {
    this.x1 = _x1;
    this.y1 = _y1;
    this.x2 = _x2;
    this.y2 = _y2;
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
lines = [];

//assume just line tool for now
    canvas.addEventListener("click", function(event) {
      const x = event.offsetX;
      const y = event.offsetY;
      ctx.beginPath();
      ctx.moveTo(x,y);
      if (!isDrawing) {
        l = new Line(x,y,x,y);
        lines.push(l);
        isDrawing = true;
      } else {
        isDrawing = false;
      }
    });
    canvas.addEventListener("mousemove", function(event) {
      
      if (isDrawing) {
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (i = 0; i < lines.length-1; i++) {
          lines[i].draw(ctx)
        }
        l = lines[lines.length-1];
        l.x2 = event.offsetX;
        l.y2 = event.offsetY;
        l.draw(ctx);
      }



    });