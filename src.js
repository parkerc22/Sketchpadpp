window.alert("ATTENTION\n thank you for your attention");
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

    canvas.addEventListener("click", function(event) {
      const x = event.offsetX;
      const y = event.offsetY;
      window.alert("wow! you clicked at x=" + x + " and y=" + y);
    });