window.alert("ATTENTION\n thank you for your attention");
const canvas = document.getElementById("myCanvas");
    const ctx = canvas.getContext("2d");

    canvas.addEventListener("click", function(event) {
      const x = event.offsetX;
      const y = event.offsetY;
      const size = 20; // Shape size
      const shapeType = "circle"; // or "rectangle"

      if (shapeType === "circle") {
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.closePath();
      } else if (shapeType === "rectangle") {
         ctx.fillStyle = "blue";
         ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    });