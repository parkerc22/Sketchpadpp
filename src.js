//-----TO-DO----------------------
//fix parallel constraints bugs
//moving circle center should try to keep endpoints but change radii
//points are INDEPENDENT. lines and circles are DEPENDENT on their endpoints.
const canvas = document.getElementById("myCanvas");
canvas.style.cursor = "crosshair";
const ctx = canvas.getContext("2d");
ctx.fillStyle = "white";
ctx.strokeStyle = "white";
ctx.font = "200px Arial";
var initial_text = "INK";
var textWidth = ctx.measureText(initial_text).width;
ctx.fillText(initial_text, canvas.width / 2 - textWidth / 2, canvas.height / 2);

canvas.focus();
isDrawing = false;
drawCircle = true;
drawLine = false;
moving = false;
enforceDistanceWhileMoving = true;
enforceDistanceWhileClicking = true;
enforceEqualityWhileMoving = true;
enforceParallelWhileMoving = false;
enforceAllWhileMoving = false;
creatingEqualityConstraint = false;
creatingParallelConstraint = false;
drawConstraints = false;
raw_mx = 0;
mx = 0;
var WIDTH = canvas.width;
pointSnapRadius = 20; //this radius is in pixels
lineSnapRadius = 17; //this radius is in pixels
circleSnapRadius = 17; //this radius is also in pixels
moveRadius = 20; //this radius is in pixels
var HEIGHT = canvas.height;
raw_my = 0;
my = 0;
//the coordinate transformation to map from coordinates to pixels (scale and then offset)
windowTransform = {Xscale: 1.0, Yscale: 1.0, Xoffset: 0.0, Yoffset: 0.0}
//line by default

const pressedKey = document.getElementById("pressedKey");
var keyPressed = "Key Pressed: ";
displayKeyPressed = false;
var resolvedKey = true

//----------TOOLS-----------------------------------------------------

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
}

function dot(p1, p2, q1, q2) {
  //return dot product of (p2-p1) and (q2-q1)
  var px = p2.x-p1.x;
  var py = p2.y-p1.y;
  var qx = q2.x-q1.x;
  var qy = q2.y-q1.y;
  return (px*qx)+(py*qy);
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

function drawDisplay(ctx, canvas, points, lines, circles, constraints, drawConstraints) {
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
  for (p = 0; p < points.length; p++) {
    points[p].draw(ctx);
  }

  if (drawConstraints) {
    for (j = 0; j < constraints.length; j++) {
      constraints[j].draw(ctx);
    }
  }
}

//not currently using the function, only snaps to points at the moment, update it later
function snapCoords(x, y, points, lines, circles, windowTransform, snapRadius) {
  var output = [null, null, null];
  for (p = 0; p < points.length; p++) {
    pt = points[p]
    if (distToPix(dist(x, y, pt.x, pt.y), windowTransform) < snapRadius && !points[p].beingMoved) {
      output[0] = pt;
    }
  }
  return output;
}

function snapPix(x, y, points, lines, circles, windowTransform, pointSnapRadius, lineSnapRadius, circleSnapRadius) {
  var output = [null, null, null, null];
  //output = [point snapped to, line snapped to, circle snapped to, snapped line projection]

  for (p = 0; p < points.length; p++) {
    var coord = coordToPix(points[p].x, points[p].y, windowTransform);
    if (dist(x, y, coord[0], coord[1]) < pointSnapRadius && !points[p].beingMoved) {
      output[0] = points[p];
    }
  }

  for (k = 0; k < lines.length; k++) {
    l = lines[k];
    if (!l.isFinished) {
      continue;
    }
    //To determine if a point P is within the lineSnapRadius of a line segment with endpoints A and B:
    //First project AP onto AB with formula proj = AP dot AB / (AB dot AB) times vector AB
    //Then, to determine if it lies between the endpoints, check if the length of this projection is "less than zero" or greater than len(AB)
    //Then use the length of AP minus its projection to compare against lineSnapRadius

    //added this to fix bug
    var coords  = pixToCoord(x, y, windowTransform)
    var dot1 = dot(l.endpoints[0], new Point(coords[0], coords[1]), l.endpoints[0], l.endpoints[1]);
    var dot2 = dot(l.endpoints[0], l.endpoints[1], l.endpoints[0], l.endpoints[1]);
    var projX = dot1/dot2 * (l.endpoints[1].x-l.endpoints[0].x);
    var projY = dot1/dot2 * (l.endpoints[1].y-l.endpoints[0].y);

    if (projX*projX + projY * projY > dot2) {
      //then, the projection is longer than the line segment, so reject
      continue;
    }
    if (dot1 < 0) {
      //then, it points away, so its out of bounds, reject
      continue;
    }
    //check if it is within the lineSnapRadius
    //compute orthogonal component
    orthX = projX - (coords[0]-l.endpoints[0].x);
    orthY = projY - (coords[1]-l.endpoints[0].y);
    var rad = distToCoord(lineSnapRadius, windowTransform);
    if (orthX*orthX + orthY * orthY  < rad*rad) {
      output[1] = l;
      //output line  snapped point should be in pixels
      var outPoint = coordToPix(projX + l.endpoints[0].x, projY + l.endpoints[0].y, windowTransform);
      output[3] = new Point(outPoint[0], outPoint[1]);
    }
  }

  for (j = 0; j < circles.length; j++) {
    c = circles[j];
    var coord = coordToPix(c.center.x, c.center.y, windowTransform);
    if (Math.abs(dist(x, y, coord[0], coord[1]) - distToPix(c.r, windowTransform)) < circleSnapRadius) {
      //then, check that the coordinates lie between the endpoints! 
      var d1 = Math.atan((c.endpoints[0].y-c.center.y)/(c.endpoints[0].x-c.center.x));
      if (c.endpoints[0].x-c.center.x < 0) {
        d1 += Math.PI;
      }

      var d2 = Math.atan((c.endpoints[1].y-c.center.y)/(c.endpoints[1].x-c.center.x));
      if (c.endpoints[1].x-c.center.x < 0) {
        d2 += Math.PI;
      }

      var pt = pixToCoord(x, y, windowTransform);
      var angle = Math.atan((pt[1]-c.center.y)/(pt[0]-c.center.x));
      if (pt[0]-c.center.x < 0) {
        angle += Math.PI;
      }
      if (d1 < angle || angle < d2) {
        output[2] = c;
      }
    } 
  }
  return output;
}


//performs a timestep for the constraint satisfaction. pixThreshold is the threshold beyond which a constraint is considered satisfied/in "final" state.
function tickDistanceConstraints(constraints, points, lines, circles, windowTransform, pixThreshold) {
  for (c = 0; c < constraints.length; c++) {
    constraint = constraints[c];
    if (constraint.type === "Distance") {

      //If the constraint type is a distance type, move the floater 2/3 of the way towards the anchor pt
      var d = dist(constraint.anchor.x, constraint.anchor.y, constraint.floater.x, constraint.floater.y);
      
      //compute 2/3 interpolated target distance
      var target = (2*constraint.dist / 3) + (d/3);
      
      //update floater point coordinates
      constraint.floater.x = constraint.anchor.x + target / d * (constraint.floater.x-constraint.anchor.x);
      constraint.floater.y = constraint.anchor.y + target / d * (constraint.floater.y-constraint.anchor.y);

    }
  }
}

function tickEqualityConstraints(constraints, points, lines, circles, windowTransform, pixThreshold) {
  for (i = 0; i < constraints.length; i++) {
    c = constraints[i];
    if (c.type === "EqualLength") {
      //nudge points along their axes, 2/3 of the way towards the median length
      var pDist = dist(c.p1.x, c.p1.y, c.p2.x, c.p2.y);
      var qDist = dist(c.q1.x, c.q1.y, c.q2.x, c.q2.y);
      var avgLength = 0.5*pDist + 0.5*qDist;
      var pTargetLength = 2*avgLength/3 + pDist/3;
      var qTargetLength = 2*avgLength/3 + qDist/3;
      var pCenterX = 0.5*c.p1.x + 0.5*c.p2.x;
      var pCenterY = 0.5*c.p1.y + 0.5*c.p2.y;
      var qCenterX = 0.5*c.q1.x + 0.5*c.q2.x;
      var qCenterY = 0.5*c.q1.y + 0.5*c.q2.y;
      c.p1.x = pCenterX + pTargetLength/pDist*(c.p1.x - pCenterX);
      c.p1.y = pCenterY + pTargetLength/pDist*(c.p1.y - pCenterY);
      c.p2.x = pCenterX + pTargetLength/pDist*(c.p2.x - pCenterX);
      c.p2.y = pCenterY + pTargetLength/pDist*(c.p2.y - pCenterY);
      c.q1.x = qCenterX + qTargetLength/qDist*(c.q1.x - qCenterX);
      c.q1.y = qCenterY + qTargetLength/qDist*(c.q1.y - qCenterY);
      c.q2.x = qCenterX + qTargetLength/qDist*(c.q2.x - qCenterX);
      c.q2.y = qCenterY + qTargetLength/qDist*(c.q2.y - qCenterY);
    }
  }
}

function tickParallelConstraints(constraints, points, lines, circles, windowTransform, pixThreshold) {
  for (i = 0; i < constraints.length; i++) {
    c = constraints[i];
    if (c.type === "Parallel") {
      //calculate the relative rotations and then rotate each line segment 2/3 of the way to the middle?
      //calculate the two angles of each line and calculate the target angle difference
      //console.log(c.p2.y, c.p1.y, c.p2.x, c.p1.x);
      var ang1 = Math.atan((c.p2.y-c.p1.y)/(c.p2.x-c.p1.x));
      if ((c.p2.y-c.p1.y)/(c.p2.x-c.p1.x) < 0) {
        ang1 += Math.PI;
      }
      //console.log(c.q2.y, c.q1.y, c.q2.x, c.q1.x);
      var ang2 = Math.atan((c.q2.y-c.q1.y)/(c.q2.x-c.q1.x));
      if ((c.q2.y-c.q1.y)/(c.q2.x-c.q1.x) < 0) {
        ang2 += Math.PI;
      }
      var medAngle = 0.5*(ang1+ang2);
      //find the median angle that makes sense
      if (Math.abs(medAngle - ang1) > 0.5*Math.PI) {
        medAngle += Math.PI;
      }
      //console.log(ang1, ang2, medAngle);
      var rot1 = -2*(ang1-medAngle) / 3;
      var rot2 = -2*(ang2-medAngle) / 3;
      if (rot1 < -0.5*Math.PI) {
        rot1 += 2*Math.PI;
      }
      if (rot2 < -0.5*Math.PI) {
        rot2 += 2*Math.PI;
      }

      //console.log(rot1, rot2);
      //subtract the center point of each line and apply rotation matrices to the endpoints
      var pMid = new Point(0.5*(c.p1.x+c.p2.x), 0.5*(c.p1.y+c.p2.y));
      var qMid = new Point(0.5*(c.q1.x+c.q2.x), 0.5*(c.q1.y+c.q2.y));

      var pTargetLength = dist(c.p1.x, c.p1.y, c.p2.x, c.p2.y);
      var qTargetLength = dist(c.q1.x, c.q1.y, c.q2.x, c.q2.y);

      c.p1.x = pMid.x + (Math.cos(rot1) * (c.p1.x-pMid.x) - Math.sin(rot1) * (c.p1.y-pMid.y));
      c.p1.y = pMid.y + (Math.sin(rot1) * (c.p1.x-pMid.x) + Math.cos(rot1) * (c.p1.y-pMid.y));
      c.p2.x = pMid.x + (Math.cos(rot1) * (c.p2.x-pMid.x) - Math.sin(rot1) * (c.p2.y-pMid.y));
      c.p2.y = pMid.y + (Math.sin(rot1) * (c.p2.x-pMid.x) + Math.cos(rot1) * (c.p2.y-pMid.y));
      c.q1.x = qMid.x + (Math.cos(rot2) * (c.q1.x-qMid.x) - Math.sin(rot2) * (c.q1.y-qMid.y));
      c.q1.y = qMid.y + (Math.sin(rot2) * (c.q1.x-qMid.x) + Math.cos(rot2) * (c.q1.y-qMid.y));
      c.q2.x = qMid.x + (Math.cos(rot2) * (c.q2.x-qMid.x) - Math.sin(rot2) * (c.q2.y-qMid.y));
      c.q2.y = qMid.y + (Math.sin(rot2) * (c.q2.x-qMid.x) + Math.cos(rot2) * (c.q2.y-qMid.y));

      //manually force it to stay the same length lol
      var pDist = dist(c.p1.x, c.p1.y, c.p2.x, c.p2.y);
      var qDist = dist(c.q1.x, c.q1.y, c.q2.x, c.q2.y);
      var pCenterX = 0.5*c.p1.x + 0.5*c.p2.x;
      var pCenterY = 0.5*c.p1.y + 0.5*c.p2.y;
      var qCenterX = 0.5*c.q1.x + 0.5*c.q2.x;
      var qCenterY = 0.5*c.q1.y + 0.5*c.q2.y;
      c.p1.x = pCenterX + pTargetLength/pDist*(c.p1.x - pCenterX);
      c.p1.y = pCenterY + pTargetLength/pDist*(c.p1.y - pCenterY);
      c.p2.x = pCenterX + pTargetLength/pDist*(c.p2.x - pCenterX);
      c.p2.y = pCenterY + pTargetLength/pDist*(c.p2.y - pCenterY);
      c.q1.x = qCenterX + qTargetLength/qDist*(c.q1.x - qCenterX);
      c.q1.y = qCenterY + qTargetLength/qDist*(c.q1.y - qCenterY);
      c.q2.x = qCenterX + qTargetLength/qDist*(c.q2.x - qCenterX);
      c.q2.y = qCenterY + qTargetLength/qDist*(c.q2.y - qCenterY);
    }
  }
}

function tickHorizontalConstraints(constraints, points, lines, circles, windowTransform, pixThreshold) {
  for (i = 0; i < constraints.length; i++) {
    c = constraints[i];
    if (c.type === "Horizontal") {
      //Rotate the line 2/3 of the way towards horizontal
      //use the same code as parallel but with an imaginary parallel line
      var ang1 = Math.atan((c.p2.y-c.p1.y)/(c.p2.x-c.p1.x));
      if ((c.p2.y-c.p1.y)/(c.p2.x-c.p1.x) < 0) {
        ang1 += Math.PI;
      }

      console.log(ang1);
      var ang2 = 0;
      if (ang1 > 0.5*Math.PI) {
        ang2 = Math.PI;
      }
      var medAngle = 0.5*(ang1+ang2);
      //find the median angle that makes sense
      console.log(medAngle);
      if (Math.abs(medAngle - ang1) > 0.5*Math.PI) {
        medAngle += Math.PI;
      }
      console.log(medAngle);
      var rot1 = -2*(ang1-medAngle) / 3;
      var rot2 = -2*(ang2-medAngle) / 3;
      if (rot1 < -0.5*Math.PI) {
        rot1 += 2*Math.PI;
      }
      if (rot2 < -0.5*Math.PI) {
        rot2 += 2*Math.PI;
      }

      //subtract the center point of each line and apply rotation matrices to the endpoints
      var pMid = new Point(0.5*(c.p1.x+c.p2.x), 0.5*(c.p1.y+c.p2.y));
      var qMid = new Point(0.5*(c.q1.x+c.q2.x), 0.5*(c.q1.y+c.q2.y));

      var pTargetLength = dist(c.p1.x, c.p1.y, c.p2.x, c.p2.y);
      var qTargetLength = dist(c.q1.x, c.q1.y, c.q2.x, c.q2.y);

      c.p1.x = pMid.x + (Math.cos(rot1) * (c.p1.x-pMid.x) - Math.sin(rot1) * (c.p1.y-pMid.y));
      c.p1.y = pMid.y + (Math.sin(rot1) * (c.p1.x-pMid.x) + Math.cos(rot1) * (c.p1.y-pMid.y));
      c.p2.x = pMid.x + (Math.cos(rot1) * (c.p2.x-pMid.x) - Math.sin(rot1) * (c.p2.y-pMid.y));
      c.p2.y = pMid.y + (Math.sin(rot1) * (c.p2.x-pMid.x) + Math.cos(rot1) * (c.p2.y-pMid.y));

      //manually force it to stay the same length lol
      var pDist = dist(c.p1.x, c.p1.y, c.p2.x, c.p2.y);
      var pCenterX = 0.5*c.p1.x + 0.5*c.p2.x;
      var pCenterY = 0.5*c.p1.y + 0.5*c.p2.y;
      c.p1.x = pCenterX + pTargetLength/pDist*(c.p1.x - pCenterX);
      c.p1.y = pCenterY + pTargetLength/pDist*(c.p1.y - pCenterY);
      c.p2.x = pCenterX + pTargetLength/pDist*(c.p2.x - pCenterX);
      c.p2.y = pCenterY + pTargetLength/pDist*(c.p2.y - pCenterY);

    }
  }
}

function tickVerticalConstraints(constraints, points, lines, circles, windowTransform, pixThreshold) {
  for (i = 0; i < constraints.length; i++) {
    c = constraints[i];
    if (c.type === "Vertical") {
      //Rotate the line 2/3 of the way towards horizontal
      //use the same code as parallel but with an imaginary parallel line
      var ang1 = Math.atan((c.p2.y-c.p1.y)/(c.p2.x-c.p1.x));
      if ((c.p2.y-c.p1.y)/(c.p2.x-c.p1.x) < 0) {
        ang1 += Math.PI;
      }
      console.log(ang1);
      var ang2 = 0.5*Math.PI;
      if (ang1 > Math.PI) {
        ang2 = 1.5*Math.PI;
      }
      var medAngle = 0.5*(ang1+ang2);
      //find the median angle that makes sense
      if (Math.abs(medAngle - ang1) > 0.5*Math.PI) {
        medAngle += Math.PI;
      }
      var rot1 = -2*(ang1-medAngle) / 3;
      var rot2 = -2*(ang2-medAngle) / 3;
      if (rot1 < -0.5*Math.PI) {
        rot1 += 2*Math.PI;
      }
      if (rot2 < -0.5*Math.PI) {
        rot2 += 2*Math.PI;
      }

      //subtract the center point of each line and apply rotation matrices to the endpoints
      var pMid = new Point(0.5*(c.p1.x+c.p2.x), 0.5*(c.p1.y+c.p2.y));
      var qMid = new Point(0.5*(c.q1.x+c.q2.x), 0.5*(c.q1.y+c.q2.y));

      var pTargetLength = dist(c.p1.x, c.p1.y, c.p2.x, c.p2.y);

      c.p1.x = pMid.x + (Math.cos(rot1) * (c.p1.x-pMid.x) - Math.sin(rot1) * (c.p1.y-pMid.y));
      c.p1.y = pMid.y + (Math.sin(rot1) * (c.p1.x-pMid.x) + Math.cos(rot1) * (c.p1.y-pMid.y));
      c.p2.x = pMid.x + (Math.cos(rot1) * (c.p2.x-pMid.x) - Math.sin(rot1) * (c.p2.y-pMid.y));
      c.p2.y = pMid.y + (Math.sin(rot1) * (c.p2.x-pMid.x) + Math.cos(rot1) * (c.p2.y-pMid.y));

      //manually force it to stay the same length lol
      var pDist = dist(c.p1.x, c.p1.y, c.p2.x, c.p2.y);
      var pCenterX = 0.5*c.p1.x + 0.5*c.p2.x;
      var pCenterY = 0.5*c.p1.y + 0.5*c.p2.y;
      c.p1.x = pCenterX + pTargetLength/pDist*(c.p1.x - pCenterX);
      c.p1.y = pCenterY + pTargetLength/pDist*(c.p1.y - pCenterY);
      c.p2.x = pCenterX + pTargetLength/pDist*(c.p2.x - pCenterX);
      c.p2.y = pCenterY + pTargetLength/pDist*(c.p2.y - pCenterY);

    }
  }
}

function tickAllConstraints(constraints, points, lines, circles, windowTransform, pixThreshold) {
  tickDistanceConstraints(constraints, points, lines, circles, windowTransform, pixThreshold);
  tickEqualityConstraints(constraints, points, lines, circles, windowTransform, pixThreshold);
  tickParallelConstraints(constraints, points, lines, circles, windowTransform, pixThreshold);
  tickHorizontalConstraints(constraints, points, lines, circles, windowTransform, pixThreshold);
  tickVerticalConstraints(constraints, points, lines, circles, windowTransform, pixThreshold);
}

//---------OBJECTS-------------------------------------------------------

class RingParent {
  constructor(_parent, _next, _prev) {
    this.object = _parent;
    this.next = _next;
    this.prev = _prev;
  }
  initialize() {
    this.next = this;
    this.prev = this;
  }
}

class RingChild {
  constructor(_child, _next, _prev) {
    this.object = _child;
    this.next = _next;
    this.prev = _prev;
  }
}

class Point {
  constructor(_x, _y) {
    this.x = _x;
    this.y = _y;
    this.lines = [];
    this.ring = new RingParent(this, this, this);
    this.ring.initialize();
    this.beingMoved = false;
  }
  draw(ctx) {
    var pix1 = coordToPix(this.x, this.y, windowTransform);
    ctx.fillRect(pix1[0]-1,pix1[1]-1,3,3)
  }
}

class Line {
  // construct with two Point objects
  constructor (p, q) {
    this.points = [];
    this.endpoints = [];
    this.endpoints.push(p);
    this.endpoints.push(q);
    this.points.push(p);
    this.points.push(q);
    this.isFinished = false;

  }
  draw(ctx) {
    // Start a new Path
    var pix1 = coordToPix(this.endpoints[0].x, this.endpoints[0].y, windowTransform);
    var pix2 = coordToPix(this.endpoints[1].x, this.endpoints[1].y, windowTransform);
    ctx.beginPath();
    ctx.moveTo(pix1[0], pix1[1]);
    ctx.lineTo(pix2[0], pix2[1]);
    // Draw the Path
    ctx.stroke();
  }
}
class Circle {
  constructor(_center, _r, _direction) {
    this.r = _r;
    this.radSet = false;
    this.isFinished = false;
    this.center = _center;
    this.points = [];
    this.endpoints = [];
    this.constraints = [];
    this.direction = _direction;
  }
  draw(ctx) {
    // Start a new Path
    var pix = coordToPix(this.center.x, this.center.y, windowTransform);
    var _x = pix[0];
    var _y = pix[1];
    var _r = distToPix(this.r, windowTransform);
    if (this.radSet) {
      var d1 = Math.atan((this.endpoints[0].y-this.center.y)/(this.endpoints[0].x-this.center.x));
      if (this.endpoints[0].x-this.center.x < 0) {
        d1 += Math.PI;
      }

      var d2 = Math.atan((this.endpoints[1].y-this.center.y)/(this.endpoints[1].x-this.center.x));
      if (this.endpoints[1].x-this.center.x < 0) {
        d2 += Math.PI;
      }

      ctx.beginPath();
      if ((!this.isFinished && distToPix(dist(this.endpoints[0].x, this.endpoints[0].y, this.endpoints[1].x, this.endpoints[1].y), windowTransform) < pointSnapRadius) || this.endpoints[0] === this.endpoints[1]) {
        ctx.arc(_x, _y, _r, 0, 2*Math.PI);  
      } else {
        if (this.direction === "CCW") {
          ctx.arc(_x, _y, _r, d1, d2);
        } else {
          ctx.arc(_x, _y, _r, d2, d1);
        }
      }

      // Draw the Path
      ctx.stroke();
    } else {
      //if the radius is not yet set, just draw a point where the center was chosen
      ctx.fillRect(_x-1,_y-1,3,3)
    }
  }
}

class DistanceConstraint {
  //distance constraints have two points, with different roles
  //the ANCHOR will never move due to a distance constraint (usually the center of a circle)
  //the FLOATER will always move to satisfy a distance constraint (usually a point unbound to any circles)
  constructor(anc, flo, dist) {
    this.anchor = anc;
    this.floater = flo;
    this.dist = dist;
    this.type = "Distance";
  }

  draw(ctx) {
    ctx.font = '48px serif';
    var anc = coordToPix(this.anchor.x, this.anchor.y, windowTransform)
    ctx.fillText('A', anc[0], anc[1]); // Filled text
    var flo = coordToPix(this.floater.x, this.floater.y, windowTransform)
    ctx.fillText('F', flo[0], flo[1]); // Filled text
  }
}

class EqualLengthConstraint {
  //this constraint enforces that the distance between the first pair of points is the same as the distance between the 
  // second pair of points.
  constructor(p1, p2, q1, q2, l1, l2) {
    this.p1 = p1;
    this.p2 = p2;
    this.q1 = q1;
    this.q2 = q2;
    //lines are just object references that make it easier to delete constraints when components are deleted
    this.l1 = l1;
    this.l2 = l2;
    this.type = "EqualLength";
  }

  draw(ctx) {
    ctx.font = '48px serif';
    var pt1 = coordToPix(this.p1.x, this.p1.y, windowTransform);
    var pt2 = coordToPix(this.p2.x, this.p2.y, windowTransform);
    var qt1 = coordToPix(this.q1.x, this.q1.y, windowTransform);
    var qt2 = coordToPix(this.q2.x, this.q2.y, windowTransform);
    var pMidX = 0.5*(pt1[0] + pt2[0]);
    var pMidY = 0.5*(pt1[1] + pt2[1]);
    var qMidX = 0.5*(qt1[0] + qt2[0]);
    var qMidY = 0.5*(qt1[1] + qt2[1]);
    ctx.fillText('E1', pMidX, pMidY); // Filled text
    ctx.fillText('E2', qMidX, qMidY); // Filled text
  }
}

class ParallelConstraint {
  //this constraint enforces that the distance between the first pair of points is the same as the distance between the 
  // second pair of points.
  constructor(p1, p2, q1, q2, l1, l2) {
    this.p1 = p1;
    this.p2 = p2;
    this.q1 = q1;
    this.q2 = q2;
    this.l1 = l1;
    this.l2 = l2;
    this.type = "Parallel";
  }

  draw(ctx) {
    ctx.font = '48px serif';
    var pt1 = coordToPix(this.p1.x, this.p1.y, windowTransform);
    var pt2 = coordToPix(this.p2.x, this.p2.y, windowTransform);
    var qt1 = coordToPix(this.q1.x, this.q1.y, windowTransform);
    var qt2 = coordToPix(this.q2.x, this.q2.y, windowTransform);
    var pMidX = 0.5*(pt1[0] + pt2[0]);
    var pMidY = 0.5*(pt1[1] + pt2[1]);
    var qMidX = 0.5*(qt1[0] + qt2[0]);
    var qMidY = 0.5*(qt1[1] + qt2[1]);
    ctx.fillText('P1', pMidX, pMidY); // Filled text
    ctx.fillText('P2', qMidX, qMidY); // Filled text
  }
}

class HorizontalConstraint {
  //this constraint enforces that the distance between the first pair of points is the same as the distance between the 
  // second pair of points.
  constructor(p1, p2, l) {
    this.p1 = p1;
    this.p2 = p2;
    this.l = l;
    this.q1 = new Point(-10, 0);
    this.q2 = new Point(10, 0);
    this.type = "Horizontal";
  }

  draw(ctx) {
    ctx.font = '48px serif';
    var pt1 = coordToPix(this.p1.x, this.p1.y, windowTransform);
    var pt2 = coordToPix(this.p2.x, this.p2.y, windowTransform);
    var pMidX = 0.5*(pt1[0] + pt2[0]);
    var pMidY = 0.5*(pt1[1] + pt2[1]);
    ctx.fillText('H', pMidX, pMidY); // Filled text
  }
}

class VerticalConstraint {
  //this constraint enforces that the distance between the first pair of points is the same as the distance between the 
  // second pair of points.
  constructor(p1, p2, l) {
    this.p1 = p1;
    this.p2 = p2;
    this.l = l;
    this.q1 = new Point(0, -10);
    this.q2 = new Point(0, 10);
    this.type = "Vertical";
  }

  draw(ctx) {
    ctx.font = '48px serif';
    var pt1 = coordToPix(this.p1.x, this.p1.y, windowTransform);
    var pt2 = coordToPix(this.p2.x, this.p2.y, windowTransform);
    var pMidX = 0.5*(pt1[0] + pt2[0]);
    var pMidY = 0.5*(pt1[1] + pt2[1]);
    ctx.fillText('V', pMidX, pMidY); // Filled text
  }
}

//------------------------------------------------------------------------------------------------------------------------
//-----------------------------END OBJECT DECLARATIONS--------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------

points = [];
lines = [];
circles = [];
constraints = [];
movingPoint = new Point(0,0);


//These set autonomous timers to enforce constraints and update the display. At the moment it interferes with
//the cursor being drawn since that is not a part of the drawDisplay method and only happens on mouseMove.
//Without these autonomous intervals, the constraints are only ticked when the mouse is moved, which can look clunky.
//setInterval(tickEqualityConstraints, 1000, constraints, points, lines, circles, windowTransform, 3);
//setInterval(tickDistanceConstraints, 1000, constraints, points, lines, circles, windowTransform, 3);
//setInterval(drawDisplay, 500, ctx, canvas, points, lines, circles, constraints, drawConstraints);


//assume just line tool for now
canvas.addEventListener("click", function(event) {
  mx = event.offsetX;
  my = event.offsetY;
  raw_mx = mx;
  raw_my = my;
  
  snappedPix = snapPix(mx, my, points, lines, circles, windowTransform, pointSnapRadius, lineSnapRadius, circleSnapRadius);
  if (snappedPix[0] != null) {
    var t = coordToPix(snappedPix[0].x, snappedPix[0].y, windowTransform);
    mx = t[0];
    my = t[1];
  } else if (snappedPix[2] != null) {
    var c = snappedPix[2];
    var center = coordToPix(c.center.x, c.center.y, windowTransform);
    var d = dist(center[0], center[1], mx, my);
    var rad = distToPix(c.r, windowTransform);

    mx = center[0] + rad/d * (mx-center[0]);
    my = center[1] + rad/d * (my-center[1]);
  } else if (snappedPix[1] != null) {
    mx = snappedPix[3].x;
    my = snappedPix[3].y;
  }
  const coord = pixToCoord(mx, my, windowTransform);
  x = coord[0];
  y = coord[1];


  //Before anything, check if we should snap to another component on the grid (do not check itself)
  if (enforceDistanceWhileClicking) {
    tickDistanceConstraints(constraints, points, lines, circles, windowTransform, 3);
  }

  if (creatingEqualityConstraint) {
    if (snappedPix[1] == null) {
      //if we are trying to make an equality constraint and whiff on clicking the second line, do nothing else.
      return;
    } else {
      //otherwise, complete the equality constraint with the line we selected
      constraints[constraints.length-1].q1 = snappedPix[1].endpoints[0];
      constraints[constraints.length-1].q2 = snappedPix[1].endpoints[1];
      constraints[constraints.length-1].l2 = snappedPix[1];
      creatingEqualityConstraint = false;
      displayKeyPressed = false;
    }
  } else if (creatingParallelConstraint) {
    if (snappedPix[1] == null) {
      //if we are trying to make an parallel constraint and whiff on clicking the second line, do nothing else.
      return;
    } else {
      //otherwise, complete the parallel constraint with the line we selected
      constraints[constraints.length-1].q1 = snappedPix[1].endpoints[0];
      constraints[constraints.length-1].q2 = snappedPix[1].endpoints[1];
      constraints[constraints.length-1].l2 = snappedPix[1];
      creatingParallelConstraint = false;
      displayKeyPressed = false;
    }
  }

 if (moving) {
  moving = false;
  movePoint.beingMoved = false;
  //merge the points!!
  if (snappedPix[0] != null) {
    newpt = snappedPix[0];
    oldpt = movePoint;
    //combine the two points by checking all circles and lines for dependencies??
    for (i = 0; i < lines.length; i++) {
      l = lines[i];
      if (l.endpoints[0] === oldpt) {
        l.endpoints[0] = newpt;
      }
      if (l.endpoints[1] === oldpt) {
        l.endpoints[1] = newpt;
      }
    }
    for (j = 0; j < circles.length; j++) {
      c = circles[j];
      if (c.endpoints[0] === oldpt) {
        c.endpoints[0] = newpt;
      }
      if (c.endpoints[1] === oldpt) {
        c.endpoints[1] = newpt;
      }
      if (c.center === oldpt) {
        c.center = newpt;
      }
    }
    //delete the old one from the points[] array
    idx = -1;
    for (p = 0; p < points.length; p++) {
      if (points[p] === oldpt) {
        idx = p;
      }
    }
    if (idx != -1) {
      points.splice(idx, 1);
    }
    //free memory from the old one
    //maybe this is automatic
  } else if (snappedPix[2] != null) {
    //Else, if we snapped to a circle, add a distance constraint!
    constraints.push(new DistanceConstraint(snappedPix[2].center, movePoint, snappedPix[2].r));

  }
  displayKeyPressed = false;
 }
 if (drawLine && isDrawing) {
    l = lines[lines.length-1];
    l.isFinished = true;
    if (snappedPix[0] != null && snappedPix[0]!==l.endpoints[0]) {
      l.endpoints[1] = snappedPix[0];
    } else if (snappedPix[2] != null) {
      var c = snappedPix[2];

      var d = dist(c.center.x, c.center.y, coord[0], coord[1]);

      l.endpoints[1].x = c.center.x + c.r/d * (coord[0]-c.center.x);
      l.endpoints[1].y = c.center.y + c.r/d * (coord[1]-c.center.y);
      points.push(l.endpoints[1]);
      constraints.push(new DistanceConstraint(snappedPix[2].center, l.endpoints[1], snappedPix[2].r));

    } 
    else {
      l.endpoints[1].x = x;
      l.endpoints[1].y = y;
      points.push(l.endpoints[1]);
    }

    isDrawing = false;
    displayKeyPressed = false;
  }
  if (drawCircle) {

    if (circles[circles.length-1].isFinished == false && circles[circles.length-1].radSet == true) {
      circles[circles.length-1].isFinished = true;
      //circles[circles.length-1].endpoint[1].beingMoved = false;
      isDrawing = false;
      displayKeyPressed = false;
    } else {
      if(isDrawing) {
        //if not, then we need to set the radius of the most recent circle.
        c = circles[circles.length-1];
        c.r = dist(x, y, c.center.x, c.center.y);
        p = new Point(x, y);
        c.endpoints[0] = p;
        points.push(p);
        q = new Point(x, y);
        q.beingMoved = true;
        moving = true;
        movePoint = q;
        c.endpoints[1] = q;
        points.push(q);
        c.radSet = true;
        constraints.push(new DistanceConstraint(c.center, c.endpoints[1], c.r));
        constraints.push(new DistanceConstraint(c.center, c.endpoints[0], c.r));
      }
    }
  }
  drawDisplay(ctx, canvas, points, lines, circles, constraints, drawConstraints);
  if (!displayKeyPressed) {
    pressedKey.innerText = keyPressed;
  }
});

canvas.addEventListener("mousemove", function(event) {
  mx = event.offsetX;
  my = event.offsetY;
  raw_mx = mx;
  raw_my = my;
  if (enforceAllWhileMoving) {
    tickAllConstraints(constraints, points, lines, circles, windowTransform, 3);
  } else {
    if (enforceDistanceWhileMoving) {
      tickDistanceConstraints(constraints, points, lines, circles, windowTransform, 3);
    }

    if (enforceEqualityWhileMoving) {
      tickEqualityConstraints(constraints, points, lines, circles, windowTransform, 3);
    }

    if (enforceParallelWhileMoving) {
      tickParallelConstraints(constraints, points, lines, circles, windowTransform, 3);
    }
  }

  snappedPix = snapPix(mx, my, points, lines, circles, windowTransform, pointSnapRadius, lineSnapRadius, circleSnapRadius);
  if (snappedPix[0] != null) {
    var t = coordToPix(snappedPix[0].x, snappedPix[0].y, windowTransform);
    mx = t[0];
    my = t[1];
  } else if (snappedPix[2] != null) {
    //this means we snapped to a circle!
    //compute what our radial position would be along this circle;
    var c = snappedPix[2];
    var center = coordToPix(c.center.x, c.center.y, windowTransform);

    var d = dist(center[0], center[1], mx, my);
    var r = distToPix(c.r, windowTransform);

    mx = center[0] + r/d * (mx-center[0]);
    my = center[1] + r/d * (my-center[1]);
  } else if (snappedPix[1] != null) {
    //this means we snapped to a line
    //output[3] stores the output point
    //added this to fix bug
    //var newCoords = coordToPix(snappedPix[3].x, snappedPix[3].y, windowTransform);
    mx = snappedPix[3].x;
    my = snappedPix[3].y;
  }
  const coord = pixToCoord(mx, my, windowTransform);
  x = coord[0];
  y = coord[1];
  drawDisplay(ctx, canvas, points, lines, circles, constraints, drawConstraints);

  ctx.fillRect(mx-2,my-2,5,5)

  if (isDrawing) {
    
    if (drawLine) {
      l = lines[lines.length-1];
      l.endpoints[1].x = x;
      l.endpoints[1].y = y;
      l.draw(ctx);
    } else if (drawCircle) {
      c = circles[circles.length-1];
      if (c.radSet) {
        //if radius is set, then move around the arc lengths
        //make sure that the endpoint gets set to the correct radius
        cx = c.center.x;
        cy = c.center.y;

        d = dist(cx, cy, x, y);

        c.endpoints[1].x = cx + c.r/d * (x-cx);
        c.endpoints[1].y = cy + c.r/d * (y-cy);
      }
      c.draw(ctx);
    }
  } else if (moving) {
    movePoint.x = x;
    movePoint.y = y;
  }
});

canvas.addEventListener("keydown", function(event) {
  const key = event.key;
  snappedPix = snapPix(raw_mx, raw_my, points, lines, circles, windowTransform, pointSnapRadius, lineSnapRadius, circleSnapRadius);
  coords = pixToCoord(raw_mx, raw_my, windowTransform);
  x = coords[0];
  y = coords[1];
  displayKeyPressed = false;
  if (key==="c" || key === "x") {
    drawCircle = true;
    drawLine = false;
    displayKeyPressed = true;
    var p;
    if (snappedPix[0] != null) {
      p = snappedPix[0];
    } else if (snappedPix[2] != null) {
      //then map it to the circle;
      var c = snappedPix[2];

      var d = dist(c.center.x, c.center.y, coords[0], coords[1]);
      temp_x = c.center.x + c.r/d * (coords[0]-c.center.x);
      temp_y = c.center.y + c.r/d * (coords[1]-c.center.y);
      p = new Point(temp_x, temp_y);
      points.push(p);
      constraints.push(new DistanceConstraint(snappedPix[2].center, p, snappedPix[2].r));
    } else if (snappedPix[1] != null) {
      var pt = pixToCoord(snappedPix[3].x, snappedPix[3].y, windowTransform);
      p = new Point(pt[0], pt[1]);
      points.push(p);
    } else {
      p = new Point(x, y);
      points.push(p);
    }
    var c;
    if (key==="c") {
      c = new Circle(p, 0, "CCW");
    } else {
      c = new Circle(p, 0, "CW");
    }
    circles.push(c);
    isDrawing = true;
  }
  else if (key==="l") {
    drawCircle = false;
    drawLine = true;
    displayKeyPressed = true;
    var p;
    if (snappedPix[0] != null) {
       p = snappedPix[0];
    } else if (snappedPix[2] != null) {
      //then map it to the circle;
      var c = snappedPix[2];

      var d = dist(c.center.x, c.center.y, coords[0], coords[1]);
      temp_x = c.center.x + c.r/d * (coords[0]-c.center.x);
      temp_y = c.center.y + c.r/d * (coords[1]-c.center.y);
      p = new Point(temp_x, temp_y);
      points.push(p);
      constraints.push(new DistanceConstraint(snappedPix[2].center, p, snappedPix[2].r));
    } else if (snappedPix[1] != null) {
      var pt = pixToCoord(snappedPix[3].x, snappedPix[3].y, windowTransform);
      p = new Point(pt[0], pt[1]);
      points.push(p);
    }
    else {
      p = new Point(x, y);
      points.push(p);
    }
    q = new Point(x, y);
    l = new Line(p, q);
    lines.push(l);
    isDrawing = true;
  } else if (key === "m") {
    //find closest point to current cursor among points that are within moveRadius dist
    var best = new Point(0,0);
    var bestDist = 100000;
    for (p = 0; p < points.length; p++) {
      var coord = coordToPix(points[p].x, points[p].y, windowTransform);
      var d = dist(raw_mx, raw_my, coord[0], coord[1]);
      if (d < Math.min(moveRadius, bestDist)) {
        best = points[p];
        bestDist = d;
      }
    }

    if (bestDist < 100000) {
      moving = true;
      movePoint = best;
      movePoint.beingMoved = true;
      displayKeyPressed = true;
    }

  }
  else if (key === "t") {
    //tick constraints
    tickAllConstraints(constraints, points, lines, circles, windowTransform, 3);
    drawDisplay(ctx, canvas, points, lines, circles, constraints, drawConstraints);
    displayKeyPressed = false;

  } else if (key === "q") {
    //toggle constraints display
    drawConstraints = !drawConstraints;
    drawDisplay(ctx, canvas, points, lines, circles, constraints, drawConstraints);
  }

  else if (key === "e") {
    //create an equal distance constraint
    //we need to guarantee that we select two lines
    //if not currently snapped to a line, do nothing
    if (snappedPix[1] != null) {
      //use the endpoints of this line as the first two points for the equality constraint
      constraints.push(new EqualLengthConstraint(snappedPix[1].endpoints[0], snappedPix[1].endpoints[1], snappedPix[1].endpoints[0], snappedPix[1].endpoints[1], snappedPix[1], snappedPix[1]))
      creatingEqualityConstraint = true;
      displayKeyPressed = true;
    }
  }

  else if (key === "p") {
    //create an parallel constraint
    //we need to guarantee that we select two lines
    //if not currently snapped to a line, do nothing
    if (snappedPix[1] != null) {
      //use the endpoints of this line as the first two points for the equality constraint
      constraints.push(new ParallelConstraint(snappedPix[1].endpoints[0], snappedPix[1].endpoints[1], snappedPix[1].endpoints[0], snappedPix[1].endpoints[1], snappedPix[1], snappedPix[1]))
      creatingParallelConstraint = true;
      displayKeyPressed = true;
    }
  }

  else if (key === "h") {
    //create a horizontal constraint
    //if not currently snapped to a line, do nothing
    if (snappedPix[1] != null) {
      //use the endpoints of this line as the two points for the horizontal constraint
      constraints.push(new HorizontalConstraint(snappedPix[1].endpoints[0], snappedPix[1].endpoints[1], snappedPix[1]));
      displayKeyPressed = true;
    }
  }

  else if (key === "v") {
    //create a vertical constraint
    //if not currently snapped to a line, do nothing
    if (snappedPix[1] != null) {
      //use the endpoints of this line as the two points for the vertical constraint
      constraints.push(new VerticalConstraint(snappedPix[1].endpoints[0], snappedPix[1].endpoints[1], snappedPix[1]));
      displayKeyPressed = true;
    }
  }

  else if (key === "d") {
    //DELETE FUNCTION
    //If snapped to a point, delete that point and all lines and circles that use that point as an endpoint or radius
    //else if snapped to a circle, just delete the circle
    //else if snapped to a line, just delete the line
    if (snappedPix[0] != null) {
      //delete the old one from the points[] array
      idx = -1;
      for (p = 0; p < points.length; p++) {
        if (points[p] === snappedPix[0]) {
          idx = p;
        }
      }
      if (idx != -1) {
        points.splice(idx, 1);
      }
      //find any lines whose endpoint is the snapped pix point
      idxs = [];
      for (l = lines.length-1; l >= 0; l--) {
        if (lines[l].endpoints[0] === snappedPix[0] || lines[l].endpoints[1] === snappedPix[0]) {
          idxs.push(l);
        }
      }

      //find any constraints incident on those lines (this is where recursion would have been helpful lol)


      //then remove the original lines
      for (i = 0; i < idxs.length; i++) {
        lines.splice(idxs[i], 1);
      }

      //find any circles that have the point as an endpoint or radius
      idxs = [];
      for (c = circles.length-1; c >= 0; c--) {
        if (circles[c].endpoints[0] === snappedPix[0] || circles[c].endpoints[1] === snappedPix[0] || circles[c].center === snappedPix[0]) {
          idxs.push(c);
        }
      }
      for (i = 0; i < idxs.length; i++) {
        circles.splice(idxs[i], 1);
      }

    } else if (snappedPix[1] != null) {
      //delete the old one from the lines[] array
      idx = -1;
      for (l = 0; l < lines.length; l++) {
        if (lines[l] === snappedPix[1]) {
          idx = l;
        }
      }
      if (idx != -1) {
        lines.splice(idx, 1);
      }
      idx = []
      for (c = constraints.length-1; c>= 0; c--) {
        //delete all horizontal and vertical constraints using that line
        if (constraints[c].type === "Horizontal" || constraints[c].type === "Vertical") {
          if (constraints[c].l === snappedPix[1]) {
            idx.push(c);
          }
        }
        //Also, delete all parallel and equal length constraints using that line
        else if (constraints[c].type === "EqualLength" || constraints[c].type === "Parallel") {
          if (constraints[c].l1 === snappedPix[1] || constraints[c].l2 === snappedPix[2]) {
            idx.push(c);
          }
        }
      }
      for (i = 0; i < idx.length; i++) {
        constraints.splice(idx[i], 1);
      }
    } else if (snappedPix[2] != null) {
      //delete the old one from the circles[] array
      idx = -1;
      for (c = 0; c < circles.length; c++) {
        if (circles[c] === snappedPix[2]) {
          idx = c;
        }
      }
      if (idx != -1) {
        circles.splice(idx, 1);
      }
    }
    drawDisplay(ctx, canvas, points, lines, circles, constraints, drawConstraints);

  }

  else if (key === "a"){
    //zoom in
    //relative to mouse position, whose pix are stored in mx and my
    var Xzoom = 1.02;
    var Yzoom = 1.02;
    
    var c = pixToCoord(mx, my, windowTransform);
    
    //new center coordinates
    var cx = c[0];
    var cy = c[1];

    //new total height/width of coord window
    var cwidth = WIDTH/windowTransform.Xscale;
    var cheight = HEIGHT/windowTransform.Yscale;

    windowTransform.Xscale *= Xzoom;
    windowTransform.Yscale *= Yzoom;
    windowTransform.Xoffset += cx*WIDTH*(1-Xzoom) / (cwidth)
    windowTransform.Yoffset += cy*HEIGHT*(1-Yzoom) / (cheight)
    
    drawDisplay(ctx, canvas, points, lines, circles, constraints, drawConstraints);
  }
  else if (key === "s") {
    //zoom out
    var Xzoom = 1/1.02;
    var Yzoom = 1/1.02;
    
    var c = pixToCoord(mx, my, windowTransform);
    
    //new center coordinates
    var cx = c[0];
    var cy = c[1];

    //new total height/width of coord window
    var cwidth = WIDTH/windowTransform.Xscale;
    var cheight = HEIGHT/windowTransform.Yscale;

    windowTransform.Xscale *= Xzoom;
    windowTransform.Yscale *= Yzoom;
    windowTransform.Xoffset += cx*WIDTH*(1-Xzoom) / (cwidth)
    windowTransform.Yoffset += cy*HEIGHT*(1-Yzoom) / (cheight)
    
    drawDisplay(ctx, canvas, points, lines, circles, constraints, drawConstraints);
  }

  if (displayKeyPressed) {
    pressedKey.innerText = keyPressed + key.toUpperCase();
  } else {
    pressedKey.innerText = keyPressed;
  }
});