// based on view-source:http://mikolalysenko.github.io/Isosurface/

//webgl
var gl;
var triangleVertexPositionBuffer;
var squareVertexPositionBuffer;
var shaderProgram;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

//fps
var max_fps = 60;
var fps = 0;
var now;
var then = Date.now();
var interval = 1000/max_fps;
var delta;
var lastTime = 0;
var frameCount = 0;
var elapsedTime = 0;
var counter = 0;
var first = then;


var rCube = 0;

//volume rendering
var volume = null;
var mc = null;

function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    		console.error(e);
    }
    if (!gl) {
        console.error("Could not initialise WebGL, sorry :-(");
    }
}

function getShader(gl, id) 
{
    var shaderScript = document.getElementById(id);
    if(!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while(k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if(shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if ( !gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) ) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    //shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    //gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation( shaderProgram, "uPMatrix" );
    shaderProgram.mvMatrixUniform = gl.getUniformLocation( shaderProgram, "uMVMatrix" );
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function initBuffers() {
	
	//initCube();
    initVolume();
}

function initCube() {
	cubeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cubeVertexPositionBuffer );
    vertices = 
    [
        // Front face
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,

      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,

      // Top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0,

      // Bottom face
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,

      // Right face
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0,

      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0,
    ];
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW );
    cubeVertexPositionBuffer.itemSize = 3;
    cubeVertexPositionBuffer.numItems = 24;

	cubeVertexColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexColorBuffer);
	colors = [
		[1.0, 0.0, 0.0, 1.0], // front face
		[1.0, 1.0, 0.0, 1.0], // back face
		[0.0, 1.0, 0.0, 1.0], // top face
		[1.0, 0.5, 0.5, 1.0], // bottom face
		[1.0, 0.0, 1.0, 1.0], // right face
		[0.0, 0.0, 1.0, 1.0]  // left face
	];
	
	var unpackedColors = [];
	for(var i in colors) {
		var color = colors[i];
		for(var j=0; j<4; ++j) {
			unpackedColors = unpackedColors.concat(color);
		}
	}
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
	cubeVertexColorBuffer.itemSize = 4;
	cubeVertexColorBuffer.numItems = 24;
	
	cubeVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	var cubeVertexIndices = [
		0, 1, 2,	0, 2, 3, 	// front face
		4, 5, 6,	4, 6, 7,	// back face
		8, 9, 10,	8, 10, 11,	// top face
		12, 13, 14,	12, 14, 15,	// bottom face
		16, 17, 18,	16, 18, 19,	// right face
		20, 21, 22,	20, 22, 23	// left face
	];
	
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
	cubeVertexIndexBuffer.itemSize = 1;
	cubeVertexIndexBuffer.numItems = 36;
}

function initVolume() {
	
	volume = new Volume(new Sphere());
	volume.create();
	mc = MarchingCubes(volume.data, volume.resolution);
	console.log(volume);
	console.log(mc);
	
	volumeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, volumeVertexPositionBuffer );
	
	vertices = new Float32Array(mc.vertices.length*3);
	var pos = 0;
	for(var i = 0; i < mc.vertices.length; ++i) {
		vertices[pos]=mc.vertices[i][0];
		vertices[pos+1]=mc.vertices[i][1];
		vertices[pos+2]=mc.vertices[i][2];
		pos += 3;
	}
	
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW );
    volumeVertexPositionBuffer.itemSize = 3;
    volumeVertexPositionBuffer.numItems = mc.vertices.length;
	
	volumeVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, volumeVertexIndexBuffer);
	
	var volumeVertexIndices = new Uint16Array(mc.faces.length*3);
	var pos = 0;
	for(var i = 0; i < mc.faces.length; ++i) {
		volumeVertexIndices[pos]=mc.faces[i][0];
		volumeVertexIndices[pos+1]=mc.faces[i][1];
		volumeVertexIndices[pos+2]=mc.faces[i][2];
		pos += 3;
	}
	
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(volumeVertexIndices), gl.STATIC_DRAW);
	volumeVertexIndexBuffer.itemSize = 1;
	volumeVertexIndexBuffer.numItems = mc.faces.length*3;
}

function drawScene() {
    gl.viewport( 0, 0, gl.viewportWidth, gl.viewportHeight );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	
	//drawCube();
	drawVolume();
}

function drawVolume() {
	mat4.perspective( 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix );
    mat4.identity( mvMatrix );
    mat4.translate( mvMatrix, [-5.0, 0.0, -50.0] );
	
	mat4.set(mvMatrix,  mat4.create());
	mat4.rotate(mvMatrix, rCube*Math.PI/180, [0, 1, 0]);
	
    gl.bindBuffer(gl.ARRAY_BUFFER, volumeVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, volumeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, volumeVertexIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, volumeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

}

function drawCube() {
	mat4.perspective( 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix );
    mat4.identity( mvMatrix );
    mat4.translate( mvMatrix, [0.0, 0.0, -20.0] );
	
	mat4.set(mvMatrix,  mat4.create());
	mat4.rotate(mvMatrix, Math.PI*0.1, [1, 0, 0]);
	
	mat4.set(mvMatrix,  mat4.create());
	mat4.rotate(mvMatrix, rCube*Math.PI/180, [0, 1, 0]);
	
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexColorBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, cubeVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function animate() {
	var timeNow = new Date().getTime();
	if(lastTime != 0) {
		var elapsed = timeNow - lastTime;

		rCube -= (75*elapsed)/1000.0;
	}
	lastTime = timeNow;	
}

function draw() {
	
	requestAnimationFrame(draw);
	
	now = Date.now();
    delta = now - then;
     
    if (delta > interval) {
        // update time stuffs
         
        // Just `then = now` is not enough.
        // Lets say we set fps at 10 which means
        // each frame must take 100ms
        // Now frame executes in 16ms (60fps) so
        // the loop iterates 7 times (16*7 = 112ms) until
        // delta > interval === true
        // Eventually this lowers down the FPS as
        // 112*10 = 1120ms (NOT 1000ms).
        // So we have to get rid of that extra 12ms
        // by subtracting delta (112) % interval (100).
        // Hope that makes sense.
         
        then = now - (delta % interval);
         
        // ... Code for Drawing the Frame ...
		
		drawScene();
		animate();
		
		elapsedTime = (then - first)/1000;
		
		var div_fps = document.getElementById('fps');
		fps = ++counter/elapsedTime;
		div_fps.innerHTML = parseInt(fps) + 'fps: '+ counter + 'f / ' + parseInt(elapsedTime) + 's';
    }
}

function webGLStart() {

    var canvas = document.getElementById("canvas");
    initGL( canvas );
    initShaders();
    initBuffers();

    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable( gl.DEPTH_TEST );
	
	var div_max_fps = document.getElementById('max_fps');
	div_max_fps.innerHTML = max_fps + 'fps';
	
	var div_fps = document.getElementById('fps');
	div_fps.innerHTML = fps;
	
	var div_volume = document.getElementById('volume');
	div_volume.innerHTML = volume.name;
	
	var div_resolution = document.getElementById('resolution');
	div_resolution.innerHTML = volume.resolution[0]+"x"+volume.resolution[1]+"x"+volume.resolution[2];

	var div_range_x = document.getElementById('range_x');
	var div_range_y = document.getElementById('range_y');
	var div_range_z = document.getElementById('range_z');
	div_range_x.innerHTML = "["+volume.polygon.dims[0][0]+","+volume.polygon.dims[0][1]+"]";
	div_range_y.innerHTML = "["+volume.polygon.dims[1][0]+","+volume.polygon.dims[1][1]+"]";
	div_range_z.innerHTML = "["+volume.polygon.dims[2][0]+","+volume.polygon.dims[2][1]+"]";

	var div_step_x = document.getElementById('step_x');
	var div_step_y = document.getElementById('step_y');
	var div_step_z = document.getElementById('step_z');
	div_step_x.innerHTML = volume.polygon.dims[0][2];
	div_step_y.innerHTML = volume.polygon.dims[1][2];
	div_step_z.innerHTML = volume.polygon.dims[2][2];
	
	var div_num_vertices = document.getElementById('num_vertices');
	num_vertices.innerHTML = mc.vertices.length;

	var div_num_faces = document.getElementById('num_faces');
	num_faces.innerHTML = mc.faces.length;
	
	var div_num_indices = document.getElementById('num_indices');
	num_indices.innerHTML = mc.faces.length*3;
	
    draw();
}
