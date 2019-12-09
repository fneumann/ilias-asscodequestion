import Vue from 'vue'

/**
 * This object defines the programming languages supported for code highlighting
 * using CodeMirror
 * @namespace cmMode The programminglanguages supported
 */
const mimeTypesForLanguage = {
    'c': {mime:'text/x-csrc', displayName:'C'}, // (C),
    'c++': {mime:'text/x-c++src', displayName:'C++'}, // (C++),
    'c#': {mime:'text/x-csharp', displayName:'C#'}, // (C#),
    'css': {mime:'text/css', displayName:'CSS'}, // (CSS)
    'fortran': {mime:'text/x-fortran', displayName:'Fortran'}, // (Fortran)
    'glsl': {mime:'text/x-glsl', displayName:'GLSL'}, // (GLSL)
    'html': {mime:'text/html', displayName:'HTML'}, // (HTML)
    'java': {mime:'text/x-java', displayName:'Java'}, // (Java),
    'javascript': {mime:'text/javascript', displayName:'JavaScript'}, // (JavaScript)
    'objectivec': {mime:'text/x-objectivec', displayName:'Objective-C'}, // (Objective-C),
    'perl': {mime:'text/x-perl', displayName:'Perl'}, // (Perl)
    'php': {mime:'application/x-httpd-php', displayName:'PHP'}, // (PHP)
    'python': {mime:'text/x-python', displayName:'Python'}, // (Python)
    'r': {mime:'text/x-rsrc', displayName:'R'}, //(R)
    'ruby': {mime:'text/x-ruby', displayName:'Ruby'}, // (Ruby)
    'sql': {mime:'text/x-mysql', displayName:'MySQL'}, // (mysql)
    'xml': {mime:'application/xml', displayName:'XML'} //text/html (XML)
};


function loadSettings(scope){
    let options = {
        baseurl : ''
    }
    const settings = scope.querySelectorAll("meta[name^=codeblocks]");
    settings.forEach(opt => {
        const name = opt.getAttribute('name');
        const value = opt.getAttribute('content');
        
        if (name=='codeblocks-baseurl'){
            options.baseurl = value;
        }
    })
    return options;
}


Vue.prototype.$CodeBlock = {
  format_info:function(text){
    return '<span style="color:green">'+text+'</span>';
  },
  format_error:function(text){
    return '<span style="color:red">'+text+'</span>';
  },
  /**
   * Seperates an outputObject (like the one you will get in the update-method of a playground handler) into a string and a json object seperated by a magic String. Returns an object that contains 
   *  <code>type</code> = <code>'dual'</code> parsed a magic string, <code>'json'</code> parsed as json, <code>'text'</code> plain text
   *  <code>json</code> = the JSON object that was sent after the magicString
   *  <code>text</code> = the String that was sent before the magicString
   * @param {*} outputObject  The outputObject generated by the student code
   * @param {*} autoJSON  When true, output that starts with [ or { will be parsed as JSON
   * @param {*} magicString The seperating String. By default it is '\n\n<JSON>\n'
   */
  processMixedOutput(outputObject, autoJSON, magicString) {
      if (magicString===undefined) magicString = '\n\n<JSON>\n';
      const idx = outputObject.indexOf(magicString);
      
      if (idx >= 0) {
          const str = outputObject.substr(0, idx);
          let json = undefined;
          const pString = outputObject.substr(idx+magicString.length);
          try {
            json = JSON.parse(pString); 
          } catch (e){
            e.parsedString = pString;
            console.log("catch")
            throw e;
          }
                
          return {
              type:'dual',
              json:json,
              text:str,
              err:err
          };
      } else {
          const too = outputObject.trim();    
          if (too.indexOf('[')==0 || too.indexOf('{')==0) {
            return {
                type:'json',
                json:JSON.parse(outputObject),
                text:""
            }
          }
      }

      return {
          type:'text',
          json:undefined,
          text:outputObject
      };
  },
  mimeType(language){
      const o = mimeTypesForLanguage[language];
      if (o===undefined) return 'text/javascript'
      return o.mime;
  },
  knownLanguages(){
    return Object
        .keys(mimeTypesForLanguage)
        .map(k => {return {label:mimeTypesForLanguage[k].displayName, value:k}})
        .sort((a,b) => a.text<b.text ? -1 : 1)
        
  },
  ...loadSettings(document)
}

Vue.$CodeBlock = Vue.prototype.$CodeBlock