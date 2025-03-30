window.alert("click in the box");
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
isDrawing = false;
//assume just line tool for now
    canvas.addEventListener("click", function(event) {
      const x = event.offsetX;
      const y = event.offsetY;
      ctx.beginPath();
      ctx.moveTo(x,y);
      isDrawing = !isDrawing;
    });
    canvas.addEventListener("mousemove", function(event) {
      window.alert("diddy alert");



    });