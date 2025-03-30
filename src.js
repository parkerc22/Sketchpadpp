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
    ctx.moveTo(0, 0);
    ctx.lineTo(300, 150);

    // Draw the Path
    ctx.stroke();
  }
}
l = new Line(0,0,0,0);
//assume just line tool for now
    canvas.addEventListener("click", function(event) {
      const x = event.offsetX;
      const y = event.offsetY;
      ctx.beginPath();
      ctx.moveTo(x,y);
      
      if (!isDrawing) {
        l.x1 = x;
        l.y1 = y;
        l.x2 = x;
        l.y2 = y;
        isDrawing = true;
      }
    });
    canvas.addEventListener("mousemove", function(event) {
      if (isDrawing) {
        l.x2 = event.offsetX;
        l.y2 = event.offsetY;
        l.draw(ctx);
      }



    });