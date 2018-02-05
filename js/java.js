
'use strict';

if ('function' === typeof importScripts) {
    importScripts('./browserfs/browserfs.min.js&?v=003');
    importScripts('./doppio/doppio.js&?v=004');
}

var JavaExec = {
  fs:null,
  options:{},
  persistentFs:null, 
  ready:false, 
  running:false, 

  constructPersistantFs : function(cb) {
      if (BrowserFS.FileSystem.IndexedDB.isAvailable()) {
          var idbfs_1 = new BrowserFS.FileSystem.IndexedDB(function (e, fs) {
              if (e) {
                  cb(new BrowserFS.FileSystem.InMemory());
              }
              else {
                  cb(idbfs_1);
              }
          }, 'doppio-cache');
      }
      else if (BrowserFS.FileSystem.HTML5FS.isAvailable()) {
          var html5fs_1 = new BrowserFS.FileSystem.HTML5FS(100 * 1024 * 1024);
          html5fs_1.allocate(function (e) {
              if (e) {
                  cb(new BrowserFS.FileSystem.InMemory());
              }
              else {
                  cb(html5fs_1);
              }
          });
      }
      else {
          cb(new BrowserFS.FileSystem.InMemory());
      }
  },

  /**
   * Initialize the System
   */
  initialize : function(cb){
    let options = Doppio.VM.JVM.getDefaultOptions('/sys');
    options.bootstrapClasspath.push("/sys/vendor/classes/"); 
    options.classpath.push("/tmp/"); 
    console.log("options", options); 
    
    JavaExec.options = options;

    JavaExec.constructPersistantFs(function (_fs) {
      console.log("Created Persistent FS");
      JavaExec.persistentFs = _fs;
      BrowserFS.initialize(_fs); 
      cb();
    });
  },

  /**
   * Create the runtime filesystem in the browser
   */
  _initFileSystem : function(baseFolder) {
    console.log("Load regular Fileystem")
      var mfs = new BrowserFS.FileSystem.MountableFileSystem()
      BrowserFS.initialize(mfs);

      mfs.mount('/sys', JavaExec.persistentFs);
      
      // Temporary storage.
      mfs.mount('/tmp', new BrowserFS.FileSystem.InMemory());
      
      // 10MB of writable storage
      // Use BrowserFS's IndexedDB file system for more storage.
      //mfs.mount('/home', new BrowserFS.FileSystem.LocalStorage());
      
      // The first argument is the filename of the listings file
      // The second argument is the relative URL to the folder containing the listings file
      // and the data it indexes.
      // In this example, the listings file and DoppioJVM's data is at
      // <thiswebpage>/doppio/listings.json
      // mfs.mount('/sys', new BrowserFS.FileSystem.XmlHttpRequest('listings.json', baseFolder+'/js/doppio'));

      
  },

  showMessage : function(msg) {
    let waitBoxes = document.querySelectorAll("#stateBox"); 
    let infoBoxes = document.querySelectorAll("#stateMessageBox");    
    console.log(msg, waitBoxes, infoBoxes)    
    for (let nr in infoBoxes){
      let box = infoBoxes[nr];     
      if (box.id) {
        box.innerHTML = msg;
      } 
    }
    for (let nr in waitBoxes){
      let box = waitBoxes[nr];
      if (box.style) {
        box.style.display = msg===null?"none":"inline-block";        
      }
    }
  },

  /**
   * Download a single file into memory
   */
  download : function(what, cb, type) {  
      let Path = BrowserFS.BFSRequire('path');    
      var xhr = new XMLHttpRequest();
      var startTime = (new Date()).getTime();
      xhr.open('GET', what);
      if (type===undefined) type = "arraybuffer";
      xhr.responseType = type;
      xhr.addEventListener('progress', function (e) {
          var time = (new Date()).getTime();
          var loaded = e.loaded;
          var total = e.total;
          // KB/s
          var rate = (loaded >> 10) / ((time - startTime) / 1000);
          var remaining = (total - loaded) >> 10;
          var remainingTime = Math.floor(remaining / rate);
          var remainingMinutes = Math.floor(remainingTime / 60);
          var remainingSeconds = remainingTime % 60;
          var percent = ((loaded / total) * 100) | 0;
          console.log("<b>Downloading</b> " + Path.basename(what) + " (" + percent + "%)");
          JavaExec.showMessage("<b>Downloading</b> " + Path.basename(what) + " (" + percent + "%)");          
          /*progressBarText.text("Downloading doppio_home.zip at " + rate.toFixed(2) + " KB/s [" + (loaded >> 10) + " KB / " + (total >> 10) + " KB] (" + remainingMinutes + "m" + remainingSeconds + "s remaining)");
          progressBar.attr('aria-valuenow', percent);
          progressBar.css('width', percent + "%");*/
      });
      xhr.addEventListener('load', function (e) {
          //console.log("Downloaded", what, e, xhr)         
          cb(null, xhr.response);
      });
      xhr.addEventListener('error', function (e) {
          console.error("Error downloading", what, e)
          cb(e, null);
      });
      xhr.addEventListener('abort', function (e) {
        console.error("Aborted Download", what, e)
        cb({error:"Aborted Download"}, null);
      });
      xhr.send();
  },
  _mkdir:function(name, cb, list){
    if (list===undefined) list = [];    
    if (name==='/' || name==='') {
      let doMake = function(e){
        if (list.length>0){
          let what = list.pop();
          //console.log("mkdir", what);
          JavaExec.fs.mkdir(what, doMake)
        } else {
          cb()
        }
      }
      doMake(null);
      return;
    }

    list.push(name);
    let Path = BrowserFS.BFSRequire('path');

    let nname = Path.dirname(name);
    JavaExec._mkdir(nname, cb, list);    
  },

  /**
   * Load All files listed in listings.js in the doppio folder
   */
  loadFiles : function(targetFolder, sourceFolder, callWhenFinished) {
    let files = [];
    
    let process = function(object, base) {      
      for(var key in object) {
        let val = object[key]
        let name = base+'/'+key;
        if (val===null){    
          //console.log("Added File", key, name, sourceFolder+'/'+name, targetFolder + '/' + name)          
          files.push({
            relPath:name,
            absPath:sourceFolder+'/'+name,          
          })          
        } else {
          process(val, name)
        }
      }
    }

    let iAmDone = function(){
      JavaExec.showMessage(null);
      callWhenFinished();
      let runButton = document.getElementById('allow_run_button');
      runButton.disabled = false;
    }

    JavaExec.showMessage("Preparing <b>Java</b> Environment");
    //load file index
    JavaExec.download(sourceFolder+"/listings.json", function(err, buffer){
      let Buffer = BrowserFS.BFSRequire('buffer').Buffer;
      let Path = BrowserFS.BFSRequire('path');
      if (err != null){
        console.error("Error downloading listings.json", err.error);
        return;
      }

      //create FileList of loadable files
      process(buffer, '');
      let counter = files.length
      console.log("Found", counter);
      
      for(let fileIdx in files){
        let file = files[fileIdx];
        let target = Path.join(targetFolder, file.relPath);
        JavaExec.fs.lstat(target,function(e, stats){
          if (stats){
            //console.log("found file", target, stats)
            counter--;
            if (counter==0) iAmDone();
            return;
          }
          JavaExec.download(file.absPath, function (fileErr, fileBuffer){
            if (fileErr == null){
              JavaExec.showMessage("<b>Writing</b> " + Path.basename(file.absPath));
              let b = new Buffer(fileBuffer);
              //console.log("processing", file, fileBuffer, b, Path.dirname(target));
              let onWritten = function(err){                
                if (err) console.error("Error writing File", err);
                //else console.log("written", err, target, JavaExec.fs.existsSync(target), stats) 
                
                counter--;
                if (counter==0) {
                  iAmDone();
                  return;
                }                
              }
              JavaExec._mkdir(Path.dirname(target), function(){
                JavaExec.fs.writeFile(target, b, onWritten);                  
              });
              
            } else {              
              console.error(fileErr.error)
              counter--;
              if (counter==0) {
                iAmDone();
                return;
              }
            }            
          }) //download  
        }) //lstat
      }
    }, "json")
  }, 

  /**
   * First download all files from the java home, then set up the runtime filesystem in the browser
   */
  initFileSystems : function(baseFolder, cb) {   
    var fs = BrowserFS.BFSRequire('fs');
    JavaExec.fs = fs;

    var mfs = new BrowserFS.FileSystem.MountableFileSystem();
    mfs.mount('/persist', JavaExec.persistentFs);
    BrowserFS.initialize(mfs);
    
    JavaExec.loadFiles('/persist', baseFolder+'/js/doppio', function() {
      JavaExec._initFileSystem(baseFolder)    
      cb()
    });
  },

  printDirContent : function(dir){
    console.log(dir)
    JavaExec.fs.readdir(dir, function(err, items){
      if (err) return;
      for (var i=0; i<items.length; i++) {
        let real = dir + '/' + items[i];             
        JavaExec.printDirContent(real);         
      }
    })
      
  },

  outputStream:'',
  errorStream:'',

  clearStdStreams: function(){
    JavaExec.outputStream = '';
    JavaExec.errorStream = '';
  },
  reroutStdStreams : function(){
    function format_info(text){
      return '<span style="color:green">'+text+'</span>';
    }
    function format_error(text){
      return '<span style="color:red">'+text+'</span>';
    }

    // Grab BrowserFS's 'process' module, which emulates NodeJS's process.
    var process = BrowserFS.BFSRequire('process');
    // Initialize TTYs; required if needed to be initialized immediately due to
    // circular dependency issue.
    // See: https://github.com/jvilk/bfs-process#stdinstdoutstderr
    process.initializeTTYs();

    var stdoutBuffer = '';
    process.stdout.on('data', function(data) {
      stdoutBuffer += data.toString();
      JavaExec.outputStream += data.toString();
      var newlineIdx;
      while ((newlineIdx = stdoutBuffer.indexOf("\n")) > -1) {
        console.log(stdoutBuffer.slice(0, newlineIdx));
        stdoutBuffer = stdoutBuffer.slice(newlineIdx + 1);
      }
    });

    var stderrBuffer = '';
    process.stderr.on('data', function(data) {
      stderrBuffer += data.toString();
      JavaExec.outputStream += format_error(data.toString());
      var newlineIdx;
      while ((newlineIdx = stderrBuffer.indexOf("\n")) > -1) {
        console.error(stderrBuffer.slice(0, newlineIdx));
        stderrBuffer = stderrBuffer.slice(newlineIdx + 1);
      }
    });

    // Write text to standard in.
    //process.stdin.write('Some text');
  },

  _whenReady(cb){
    if (JavaExec.ready) {
      cb()
    } else {
      setTimeout(JavaExec._whenReady.bind(null, cb), 100)
    }
  },

  runClass : function(className, args, cb) {
    JavaExec._whenReady(function(){
      new Doppio.VM.JVM(JavaExec.options, function(err, jvmObject) {
        console.log("here", jvmObject, err);
        jvmObject.runClass(className, args, cb);
      })
    })
  },

  javac : function(args, cb) {
    JavaExec._whenReady(function(){
      new Doppio.VM.JVM(JavaExec.options, function(err, jvmObject) {      
        jvmObject.runClass('util.Javac', args, cb);
      })
    })
  },

  compileAndRun: function(code, className, whenFinished) {     
    let Path = BrowserFS.BFSRequire('path');
    let iAmDone = function(stdout, stderr){
      JavaExec.showMessage(null);
      whenFinished(stdout, stderr);
      runButton.disabled = false;
      JavaExec.running = false;    
    }
    let runButton = document.getElementById('allow_run_button');
    runButton.disabled = true;
    if (JavaExec.running) {
      alert("Please wait for the last Java-Process to finish...");
      console.error("Already Running");
      return;
    }
    JavaExec.clearStdStreams();
    JavaExec.running = true;   
    JavaExec.showMessage("<b>Writing</b> " + className);
    let javaFile = Path.join('/tmp', className+".java");

    console.time('javac');
    console.time('run');
    JavaExec.fs.writeFile(javaFile, code, function(err){
      if (err) throw err;
      JavaExec.showMessage("<b>Compiling</b> " + className + " (this will take a while...)");

      JavaExec.javac([javaFile], function(ecode) {
        console.log('finished with', ecode);
        console.timeEnd('javac');
      
        JavaExec.showMessage("<b>Executing</b> " + className);
        if (JavaExec.errorStream === undefined || JavaExec.errorStream=='') {
          try {
            JavaExec.runClass(className, [], function(exitCode) {
              if (exitCode === 0) {
                console.log("All is good");            
              } else {
                console.error("Failed to Run " + className)
              }
              if (JavaExec.outputStream && JavaExec.outputStream!='')
                console.log(JavaExec.outputStream)
              if (JavaExec.errorStream && JavaExec.errorStream!='')
                console.error(JavaExec.errorStream)
              console.timeEnd('run')
              iAmDone(JavaExec.outputStream, JavaExec.errorStream)
            });
          } catch (e){
            console.error("Run Failed", e.error)
            iAmDone(JavaExec.outputStream, JavaExec.errorStream + "\n" + e.error);
          }
        } else {
          console.error("Compiler Failed", JavaExec.errorStream)
          iAmDone("", JavaExec.errorStream)
        }
      })
    })

    
    
    
  }

};

function runJavaWorker(code, log_callback, max_ms, max_loglength){  
  function format_info(text){
    return '<span style="color:green">'+text+'</span>';
  }
  function format_error(text){
    return '<span style="color:red">'+text+'</span>';
  }

  let exp = new RegExp("public[ \n]*class[ \n]*([a-zA-Z_$0-9]*)[ \n]*(\{|implements|extends)");
  let match = exp.exec(code);
  if (match == null){
    console.error("Unable to determine class Name!", match, code);
    return;
  }

  log_callback('<div class="sk-three-bounce"><div class="sk-child sk-bounce1"></div><div class="sk-child sk-bounce2"></div><div class="sk-child sk-bounce3"></div>');

  let className = match[1];
  console.log(code, className, log_callback, max_ms, max_loglength);
  JavaExec.compileAndRun(code, className, function(stdout, stderr){
    let tex = '';
    if (stderr && stderr!='') tex += format_error(stderr) + "\n";
    if (stdout && stdout!='') tex += format_info(stdout);
    log_callback( tex )
    console.log("Done", stdout, stderr);
  })
}

(function() {
  JavaExec.initialize(function(){
    console.log("Initializing Filesystem", JavaExec.persistentFs);
    JavaExec.initFileSystems('./Customizing/global/plugins/Modules/TestQuestionPool/Questions/assCodeQuestion', function(){
      //JavaExec.printDirContent('sys/vendor');      

      JavaExec.reroutStdStreams();
      JavaExec.ready = true;
    })
  })
})();