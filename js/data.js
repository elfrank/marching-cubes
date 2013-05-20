function Sphere() {
	return {
		dims 	:  [[-1.0,1.0,0.25],
					[-1.0,1.0,0.25],
					[-1.0,1.0,0.25]],
		fn 		: function(x,y,z) {
			return x*x + y*y + z*z - 1.0;
		}
	};
}

function Volume(polygon) {
	this.data = null;
	this.name = "Sphere";
	this.resolution = new Array(3);
	this.polygon = polygon;
}

Volume.prototype.create = function() {
	
	var fn = this.polygon.fn;
	var dims = this.polygon.dims;
	
	for(var i = 0; i < 3; ++i) {
		this.resolution[i] = 1+Math.ceil((dims[i][1]-dims[i][0])/dims[i][2]);
	}
	
	this.data = new Float32Array(this.resolution[0] * this.resolution[1] * this.resolution[2]);
	var n = 0;
	
	for(var k = 0, z = dims[2][0]; k<this.resolution[2]; ++k, z+=dims[2][2])
	for(var j = 0, y = dims[1][0]; j<this.resolution[1]; ++j, y+=dims[1][2])
	for(var i = 0, x = dims[0][0]; i<this.resolution[0]; ++i, x+=dims[0][2],++n) {
		this.data[n] = fn(x,y,z);
	}
}