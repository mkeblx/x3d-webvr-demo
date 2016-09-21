/* */

var runtime = null;

var rtLeft, rtRight;
var _renderScale = 0.5; // 1

var vrHMD = null;

var WebVRSupport = {};

var _viewpoint = "viewpoint";
var _background = "background";
var _scene = "scene";

var _x3dEl = "x3d-elem";

/*
options
*/
function _initialize( options ) {
  console.log('Initialize WebVR support');

  if (options.viewpoint)
    _viewpoint = options.viewpoint;
  if (options.background)
    _background = options.background;
  if (options.scene)
    _scene = options.scene;
  if (options.renderScale)
    _renderScale = options.renderScale;

  if (options.x3dEl)
    _x3dEl = options.x3dEl;

  if (document.readyState === 'complete') {
    load();
  } else {
    window.addEventListener('load', function ld(){
      window.removeEventListener('load', ld);
      load();
    });
  }
}

WebVRSupport.initialize = _initialize;

function load() {
  console.log('Load external webvr.x3d dependency');

  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'webvr.x3d');
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        var text = xhr.responseText;

        text = text.replace(/\$VIEWPOINT/g, _viewpoint);
        text = text.replace(/\$BACKGROUND/g, _background);
        text = text.replace(/\$SCENE/g, _scene);

        console.log(text);

        var node = document.createElement('group');
        node.innerHTML = text;

        var scene = document.getElementById('scene');
        scene.appendChild(node);

        init();
      } else {
        console.log('error: could not load webvr.x3d');
      }
    }
  }

  xhr.send();
}

function init() {
  runtime = document.getElementById(_x3dEl).runtime;

  var ns = "";
  ns = "Webvr__";
  rtLeft = document.getElementById(ns+'rtLeft');
  rtRight = document.getElementById(ns+'rtRight');

  var viewpoint = document.getElementById('vpp');

  var _initialPosition = viewpoint.getFieldValue('position');


  disableControls();


  //runtime.enterFrame = enterFrame;

  requestAnimationFrame(enterFrame);

  // update viewpoint based on HMD pose
  function enterFrame() {
    if (!vrHMD) {
      window.requestAnimationFrame(enterFrame);
      return;
    } else {
      vrHMD.requestAnimationFrame(enterFrame); // native framerate if presenting
    }

    var state = vrHMD.getPose();

    if (state.orientation !== null) {
      var o = state.orientation;
      var ori = viewpoint.requestFieldRef('orientation');
      ori.x = o[0];
      ori.y = o[1];
      ori.z = o[2];
      ori.w = o[3];
      viewpoint.releaseFieldRef('orientation');
    }
    if (state.position !== null) {
      var p = state.position;
      var posi = viewpoint.requestFieldRef('position');
      posi.x = _initialPosition.x + p[0];
      posi.y = _initialPosition.y + p[1];
      posi.z = _initialPosition.z + p[2];
      viewpoint.releaseFieldRef('position');
    }

    if (vrHMD.isPresenting) {
      vrHMD.submitFrame();
    }

  };

  runtime.exitFrame = function() {
    return; // temp

    runtime.triggerRedraw();
  };

  if (isWebVRSupported()) {
    navigator.getVRDisplays().then(vrDisplayCallback);
  } else {
    console.error('No WebVR 1.0 support');
  }


  // inject enter/exit VR button
  var enterVRBtn = document.createElement('button');
  enterVRBtn.setAttribute('id', 'enter-vr-btn');
  document.body.appendChild(enterVRBtn);
  enterVRBtn.addEventListener('click', function(event){
    enterVR();
  });

};

function isWebVRSupported() {
  return ('getVRDisplays' in navigator);
}

// toggles
function enterVR() {
  if (!vrHMD) {
    console.log('No VR headset attached');
    return;
  }

  if (!vrHMD.isPresenting) {
    var canvas = document.getElementsByTagName("canvas")[0];
    vrHMD.requestPresent( [ { source: canvas } ] )
      .then(function(){
        console.log('Started VR presenting');
    });
  } else {
    vrHMD.exitPresent().then(function(){
      console.log('Exited VR presenting');
    });
  }
}

WebVRSupport.enterVR = enterVR;

function vrDisplayCallback(vrdisplays) {
  if (vrdisplays.length) {
    vrHMD = vrdisplays[0];
    console.log(vrHMD);
  } else {
    console.log('NO VRDisplay found');
    alert("Didn't find a VR display!");
    return;
  }

  var leftEyeParams, rightEyeParams,
      leftFOV, rightFOV,
      leftTranslation, rightTranslation;

  leftEyeParams = vrHMD.getEyeParameters("left");
  rightEyeParams = vrHMD.getEyeParameters("right");
  console.log(leftEyeParams);
  console.log(rightEyeParams);

  leftFOV = leftEyeParams.fieldOfView;
  rightFOV = rightEyeParams.fieldOfView;
  console.log(leftFOV);
  console.log(rightFOV);

  // TODO: use to updated views
  // -currently using default in x3dom: 0.064 IPD
  leftTranslation = leftEyeParams.offset;
  rightTranslation = rightEyeParams.offset;
  console.log(leftTranslation);
  console.log(rightTranslation);

  //modifyRTs(leftEyeParams, rightEyeParams);
}

function modifyRTs(lEyeParams, rEyeParams) {
  var lW = Math.round(lEyeParams.renderWidth * _renderScale);
  var lH = Math.round(lEyeParams.renderHeight * _renderScale);
  var rW = Math.round(rEyeParams.renderWidth * _renderScale);
  var rH = Math.round(rEyeParams.renderHeight * _renderScale);

  var color_depth = '4';

  rtLeft.setAttribute('dimensions',  lW + ' ' + lH + ' ' + color_depth);
  rtRight.setAttribute('dimensions', rH + ' ' + rH + ' ' + color_depth);
}

var _navType = "";
function disableControls() {
  var navs = document.getElementsByTagName('navigationInfo');
  if (navs.length) {
    _navType = navs[0].getAttribute('type');
    navs[0].setAttribute('type', '');
  }
}

function enableControls() {
  var navs = document.getElementsByTagName('navigationInfo');
  if (navs.length) {
    navs[0].setAttribute('type', _navType);
  }
}
