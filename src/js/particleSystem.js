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

    var particleSize = 0.04;
    var particleSystem;

    // D3 functions
    var colorScale = d3.scaleLinear()
        .domain([0, 5])
        .range(['#d3d1d1', '#c13434'])
        .interpolate(d3.interpolateRgb);

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

    // data loading function
    self.loadData = function (file) {

        // read the csv file
        d3.csv(file)
            // iterate over the rows of the csv file
            .row(function (d) {

                // get the min bounds
                bounds.minX = Math.min(bounds.minX || Infinity, d.Points0);
                bounds.minY = Math.min(bounds.minY || Infinity, d.Points1);
                bounds.minZ = Math.min(bounds.minZ || Infinity, d.Points2);

                // get the max bounds
                bounds.maxX = Math.max(bounds.maxX || -Infinity, d.Points0);
                bounds.maxY = Math.max(bounds.maxY || -Infinity, d.Points1);
                bounds.maxZ = Math.max(bounds.maxY || -Infinity, d.Points2);

                // add the element to the data collection
                data.push({
                    // concentration density
                    concentration: Number(d.concentration),
                    // Position
                    X: Number(d.Points0),
                    Y: Number(d.Points1),
                    Z: Number(d.Points2),
                    // Velocity
                    U: Number(d.velocity0),
                    V: Number(d.velocity1),
                    W: Number(d.velocity2)
                });
            })
            // when done loading
            .get(function () {
                // draw the containment cylinder
                // TODO: Remove after the data has been rendered
                // self.drawContainment();

                // create the particle system
                self.createParticleSystem();
            });
    };

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