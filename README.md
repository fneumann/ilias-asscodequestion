# ILIAS Code Question Plugin

**Author**:   Frank Bauer <frank.bauer@fau.de>

**Version**:  1.1.1

**Company**:  Computer Graphics Group Erlangen

**Supports**: ILIAS 5.2 - 5.2

## License
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

## Installation
1. Copy the `assCodeQuestion` directory to your ILIAS installation at the following path 
(create subdirectories, if neccessary):
`Customizing/global/plugins/Modules/TestQuestionPool/Questions/assCodeQuestion`

2. Go to Administration > Plugins

3. Choose **Update** for the `assCodeQuestion` plugin
4. Choose **Activate** for the `assCodeQuestion` plugin
5. Choose **Refresh** for the `assCodeQuestion` plugin languages

There is nothing to configure for this plugin.

## Usage
This plugin enables source code questions. It basically provides a textarea with syntax 
highlighting for various languages (based on Highlight.js and CodeMirror).

Certain languages (at the moment *Java*, *Python* and *JavaScript*) can be compiled and 
executed during an Test/Assesment session. Executable Code can also be used to generate
graphical output.

### GLSL
Selecting GLSL enables you to write shader code you may process using three.js. 
When selecting this type, the first block is a "Canvas Area". All Answer-Blocks contain shader code, 
that is passed to the `outputObject`-variable of the canvas Area.

If you define a GLSL-Question (enable threeJS) where the first answer box represents the Vertex, and the second the fragment 
shader, the following canvas-area-code will allow you to use that shader on the scene:

    if (outputObject===undefined){
        setupThreeJSScene(
            outputObject, 
            canvasElement, 
            function(scene, camera, renderer){ //delegate that creates the actual scene. 
                var geometry = new THREE.BoxGeometry( 1, 1, 1 );
                var material = new THREE.MeshBasicMaterial( { color: "#FF00FF" } );
                var cube = new THREE.Mesh( geometry, material );
                scene.add(cube);
            
                return {cube:cube, geometry:geometry}
            },
            function(scene, camera, renderer, userData){ //called in the render loop
                userData.cube.rotation.x += 0.01;
                userData.cube.rotation.y += 0.01;
            }
        )
    } else {
        var threeJS = canvasElement.data('threejs')        
        threeJS.userData.cube.material = new THREE.ShaderMaterial(
          {
            vertexShader:outputObject[0], 
            fragmentShader:outputObject[1]
          }
        )
    }

### D3
If you use an executable Language, and include the D3 Library, you can add a **Canvas Area**-Block to your Question.
Add the following Code, to get a very basic D3 Sample. Your code must return a css-formated color-string 
which is used to display a simple circle.


    if (outputObject===undefined){
        //get dimension of the container
        const w = canvasElement.width()
        const h = canvasElement.height()

        //create the canvas once
        var base = d3.select(canvasElement.get(0));
        var canvas = base.append("svg")
            .attr("width", w)
            .attr("height", h);
        
        //store a reference to the canvas
        canvasElement.data('svg', canvas)

        //hide the canvas when the question is first loaded
        canvasElement.addClass('hiddenBlock')
    } else {
        //load the canvas
        const canvas = canvasElement.data('svg')        

        canvas.append("circle")
            .style("stroke", "gray")
            .style("fill", outputObject.trim())
            .attr("r", 40)
            .attr("cx", 50)
            .attr("cy", 50)
            .on("mouseover", function(){d3.select(this).style("fill", "aliceblue");})
            .on("mouseout", function(){d3.select(this).style("fill", outputObject.trim());});
    }

Alternativley you may use the built-in setup function to prepare a default D3 rendering context:


    if (outputObject===undefined){
        setupD3Scene(
            outputObject, 
            canvasElement, 
            function(canvas){ //delegate that creates the actual content
                canvas.append("circle")
                    .style("stroke", "gray")
                    .style("fill", '#0000ff')
                    .attr("r", 10)
                    .attr("cx", 150)
                    .attr("cy", 70)
        
                return {}
            }
        )

        //hide the canvas when the question is first loaded
        canvasElement.addClass('hiddenBlock')
    } else {
        //load teh canvas
        const canvas = canvasElement.data('d3').canvas        

        canvas.append("circle")
            .style("stroke", "gray")
            .style("fill", outputObject.trim())
            .attr("r", 40)
            .attr("cx", 50)
            .attr("cy", 50)
            .on("mouseover", function(){d3.select(this).style("fill", "aliceblue");})
            .on("mouseout", function(){d3.select(this).style("fill", outputObject.trim());});
    }  
    
### ThreeJS
If you use an executable Language, and include the ThreeJS Library, you can add a **Canvas Area**-Block to your Question.
Add the following Code, to get a very basic ThreeJS Sample. Your code must return a css-formated color-string 
which is used to change the color of a spinning cube.


    if (outputObject===undefined){
        //get dimension of the container
        const w = canvasElement.width()
        const h = canvasElement.height()

        // Create an empty scene
        var scene = new THREE.Scene();        

        // Create a basic perspective camera
        var camera = new THREE.PerspectiveCamera( 75, w/h, 0.1, 1000 );
        camera.position.z = 4;

        // Create a renderer with Antialiasing
        var renderer = new THREE.WebGLRenderer({antialias:true});

        // Configure renderer clear color
        renderer.setClearColor("#000000");

        // Configure renderer size
        renderer.setSize( w, h );

        // Append Renderer to DOM
        canvasElement.append( renderer.domElement );

        // Create a Cube Mesh with basic material
        var geometry = new THREE.BoxGeometry( 1, 1, 1 );
        var material = new THREE.MeshBasicMaterial( { color: "#433F81" } );
        var cube = new THREE.Mesh( geometry, material );
        
        //Store the Material
        canvasElement.data('material', material)

        // Add cube to Scene
        scene.add( cube );

        // Render Loop
        var render = function () {
            requestAnimationFrame( render );

            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;

            // Render the scene
            renderer.render(scene, camera);
        };

        render();
    } else {
        //change color to the css-string generated by the program
        var material = canvasElement.data('material')
        material.color.set(outputObject.trim())
    }

Alternativley you may use the built-in setup function to prepare a default ThreeJS rendering context:


    if (outputObject===undefined){
        setupThreeJSScene(
            outputObject, 
            canvasElement, 
            function(scene, camera, renderer){ //delegate that creates the actual scene. 
                var geometry = new THREE.BoxGeometry( 1, 1, 1 );
                var material = new THREE.MeshBasicMaterial( { color: "#0000FF" } );
                var cube = new THREE.Mesh( geometry, material );
                scene.add(cube);
            
                return {cube:cube, material:material}
            },
            function(scene, camera, renderer, userData){ //called in the render loop
                userData.cube.rotation.x += 0.01;
                userData.cube.rotation.y += 0.01;
            }
        )
    } else {
        var threeJS = canvasElement.data('threejs')
        threeJS.userData.material.color.set(outputObject.trim())
    }

## Included Software
* dopioJVM (http://plasma-umass.org/doppio-demo/)
* browserfs (https://github.com/jvilk/BrowserFS)
* highlight.js (https://highlightjs.org)
* skulpt (http://www.skulpt.org)
* three.js (https://threejs.org)
* d3 (https://d3js.org)


## Version History

### Version 1.1.1
* Added full support for canvas element drawing using data for the result output as datasource
* GLSL Code Execution (the first block is a forced Canvas Area), Answer blocks are considered fragment shaders that are passed to the Canvas Area for processing

### Version 1.1.0
* New, flexible block-system to add Question Fragments

### Version 1.0.8
* Added support for Client-Side Java-Execution using dopio.js

### Version 1.0.3
* Initial version