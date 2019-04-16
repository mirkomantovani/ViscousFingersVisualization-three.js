"use strict";

/* Get or create the application global variable */
var App = App || {};

var ParticleSystem = function () {

    // setup the pointer to the scope 'this' variable
    var self = this;

    // data container
    var data = [];

    // scene graph group for the particle system
    var sceneObject = new THREE.Group();

    // bounds of the data
    var bounds = {};

    var particleSize = 0.007;
    var particleSystem;
    var plane;

    const planeMaxDistance = 0.05;

    // D3 functions
    // var colorScale = d3.scaleLinear()
    //     .domain([0, 3])
    //     .range(['#d3d1d1', '#c13434'])
    //     .interpolate(d3.interpolateRgb);

    var colorScale = d3.scaleSequential().domain([1, 50])
        .interpolator(d3.interpolateViridis);

    var greyColorScale = d3.scaleLinear()
        .domain([0, 5])
        .range(['#9E9E9E', '#424242'])
        .interpolate(d3.interpolateRgb);


    // Slice

    var margin = { top: 40, left: 40, right: 40, bottom: 40 };

    var sliceWidth = document.getElementById('slice').offsetWidth - margin.left - margin.right;
    var sliceHeight = document.getElementById('scene').offsetHeight - margin.top - margin.bottom;

    var svg = d3.select('#slice').append('svg')
        .attr('width', sliceWidth + margin.left + margin.right)
        .attr('height', sliceHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    //xScale
    var xScale = d3.scaleLinear()
        .range([0, sliceWidth]);

    //yScale
    var yScale = d3.scaleLinear()
        .range([sliceHeight, 0]);

    // create the containment box.
    // This cylinder is only to guide development.
    // TODO: Remove after the data has been rendered
    self.drawContainment = function () {

        // get the radius and height based on the data bounds
        var radius = (bounds.maxX - bounds.minX) / 2.0 + 1;
        var height = (bounds.maxY - bounds.minY) + 1;

        // create a cylinder to contain the particle system
        var geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
        var material = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
        var cylinder = new THREE.Mesh(geometry, material);

        // add the containment to the scene
        sceneObject.add(cylinder);
    };

    // creates the particle system
    self.createParticleSystem = function () {
        var pGeom = new THREE.Geometry();
        var pMat = new THREE.PointsMaterial({
            size: particleSize
        });

        pMat.vertexColors = true;

        // use self.data to create the particle system
        data.map((p) => {
            pGeom.vertices.push(new THREE.Vector3(p.X, p.Y, p.Z));
            pGeom.colors.push(new THREE.Color(colorScale(p.concentration)));
        });

        // Create particle system
        particleSystem = new THREE.Points(pGeom, pMat);
        particleSystem.name = 'flowParticles';

        // Add particle system to scene
        sceneObject.add(particleSystem);

    };

    self.createPlane = function () {
        var height = bounds.maxY - bounds.minY;
        var width = bounds.maxX - bounds.minX;

        var planeGeom = new THREE.PlaneGeometry(width + 1, height + 1, 16);
        var planeMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, opacity: 0.3, transparent: true });

        planeMat.transparent = true;

        plane = new THREE.Mesh(planeGeom, planeMat);
        plane.name = 'plane';
        // plane.position.y = (bounds.minY + bounds.maxY) / 2;
        // plane.position.z = 5;

        sceneObject.add(plane);

    }

    //create 2d slice of data
    self.createSlice = function (planeZ) {
        if (planeZ == undefined) { planeZ = 1; }

        //remove previous points
        d3.selectAll('.point').remove();

        xScale.domain([bounds.minX, bounds.maxX]);
        yScale.domain([bounds.minY, bounds.maxY]);

        var sliceData = data.filter((p) => {
            return Math.abs(p.Z - planeZ) < planeMaxDistance;
        });

        // console.log(sliceData);

        svg.selectAll('.points')
            .data(sliceData)
            .enter()
            .append('circle')
            .attr('class', 'point')
            .attr("r", 2.5)
            .attr('cx', function (d) { return xScale(d.X); })
            .attr('cy', function (d) { return yScale(d.Y + 5); })
            .style('fill', function (d) { return colorScale(d.concentration); });
    };

    // data loading function
    self.loadData = function (file) {

        // read the csv file
        d3.csv(file)
            // iterate over the rows of the csv file
            .row(function (d) {

                // get the min bounds
                bounds.minX = Math.min(bounds.minX || Infinity, d.Points0);
                bounds.minY = Math.min(bounds.minY || Infinity, d.Points2); // Inverted 1 and 2
                bounds.minZ = Math.min(bounds.minZ || Infinity, d.Points1);

                // get the max bounds
                bounds.maxX = Math.max(bounds.maxX || -Infinity, d.Points0);
                bounds.maxY = Math.max(bounds.maxY || -Infinity, d.Points2); // Inverted 1 and 2
                bounds.maxZ = Math.max(bounds.maxY || -Infinity, d.Points1);

                // add the element to the data collection
                data.push({
                    // concentration density
                    concentration: Number(d.concentration),
                    // Position
                    X: Number(d.Points0),
                    Y: Number(d.Points2 - 5), // Inverted 1 and 2, translated down to be inside cylynder 
                    Z: Number(d.Points1),
                    // Velocity
                    U: Number(d.velocity0),
                    V: Number(d.velocity2), // Inverted 1 and 2
                    W: Number(d.velocity1)
                });
            })
            // when done loading
            .get(function () {
                // draw the containment cylinder
                // self.drawContainment();
                self.createParticleSystem();
                self.createPlane();
                self.createSlice(plane.position.z);
            });
    };

    // Slider behavior
    d3.select("#slider").on("input", function () {
        var sliderValue = this.value;
        plane.position.z = sliderValue;
        self.createSlice(sliderValue);
        recolorPoints(sliderValue);
    });

    // Button behavior
    d3.select("#resetBtn").on("click", function () {
        resetPointsColor();
    });

    var recolorPoints = function (z) {
        var vert = particleSystem.geometry.vertices;
        var mat = particleSystem.material.opacity = 0.6;
        // particleSystem.material.transparent = true;
        // var conc = particleSystem.geometry.conc;


        for (var i = 0; i < vert.length; i++) {
            var color;
            if (Math.abs(vert[i].z - z) < 2 * planeMaxDistance) {
                color = colorScale(data[i].concentration);
            } else {
                color = greyColorScale(data[i].concentration);
            }
            particleSystem.geometry.colors[i] = new THREE.Color(color);
        }
        particleSystem.geometry.colorsNeedUpdate = true;
    }

    function resetPointsColor(){
        var vert = particleSystem.geometry.vertices;
        var mat = particleSystem.material.opacity = 1;

        for (var i = 0; i < vert.length; i++) {
            var color;
            color = colorScale(data[i].concentration);
            particleSystem.geometry.colors[i] = new THREE.Color(color);
        }
        particleSystem.geometry.colorsNeedUpdate = true;
    }

    $(document).ready(function () {
        $('.tooltipped').tooltip();
    });

    // publicly available functions
    var publiclyAvailable = {

        // load the data and setup the system
        initialize: function (file) {
            self.loadData(file);
        },

        // accessor for the particle system
        getParticleSystems: function () {
            return sceneObject;
        }
    };

    return publiclyAvailable;

};