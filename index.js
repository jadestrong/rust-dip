import wasmInit from './pkg/rust_dip.js';

const runWasm = async () => {
  const rustWasm = await wasmInit('./pkg/rust_dip_bg.wasm');

  const fpsNumDisplayElement = document.querySelector('.fps-num');
  const wasmTimeRecords = [];

  let clientX, clientY;

  const kernel = flipKernel([
    [-1, -1, 1],
    [-1, 14, -1],
    [1, -1, -1],
  ]);

  // 将 kernel 转换成一维数组
  const flatKernel = kernel.reduce((acc, cur) => acc.concat(cur), []);

  const kernOffset = rustWasm.get_kernel_ptr();
  const inputPointer = rustWasm.get_input_buffer_ptr();

  const wasmByteMemoryArray = new Uint8Array(rustWasm.memory.buffer);
  const Int8View = new Int8Array(rustWasm.memory.buffer);
  Int8View.set(flatKernel, kernOffset);

  const filterWasm = (pixelData, width, height) => {
    const arLen = pixelData.length;
    wasmByteMemoryArray.set(pixelData, inputPointer);

    // console.log('Here', wasmByteMemoryArray.length);
    // rustWasm.amplify_audio();
    rustWasm.conv_filter(width, height, 4);
    // console.log('Here', wasmByteMemoryArray.length);
    return wasmByteMemoryArray.subarray(
      inputPointer,
      inputPointer + arLen
    );
  };


  let video = document.querySelector('.video');
  let canvas = document.querySelector('.canvas');

  // get a canvas context2D.
  let context2D = canvas.getContext("2d");

  // autoplay the video.
  let promise = video.play();
  if (promise !== undefined) {
    promise.catch((error) => {
      console.error('Can not autoplay!', error);
    });
  }

  video.addEventListener('loadeddata', () => {
    canvas.setAttribute('height', video.videoHeight);
    canvas.setAttribute('width', video.videoWidth);

    clientX = canvas.clientWidth;
    clientY = canvas.clientHeight;

    draw();
  });

  function draw() {
    const timeStart = performance.now();
    context2D.drawImage(video, 0, 0);

    let pixels = context2D.getImageData(0, 0, video.videoWidth, video.videoHeight);
    pixels.data.set(filterWasm(pixels.data, clientX, clientY));

    context2D.putImageData(pixels, 0, 0);

    let timeUsed = performance.now() - timeStart;
    wasmTimeRecords.push(timeUsed);
    fpsNumDisplayElement.innerHTML = calcFPS(wasmTimeRecords);

    requestAnimationFrame(draw);
  }

  function flipKernel(kernel) {
    const h = kernel.length;
    const half = Math.floor(h / 2);
    for (let i = 0; i < half; ++i) {
      for (let j = 0; j < h; ++j) {
        let _t = kernel[i][j];
        kernel[i][j] = kernel[h - i - 1][h - j - 1];
        kernel[h - i - 1][h - j - 1] = _t;
      }
    }
    if (h & 1) {
      for (let j = 0; j < half; ++j) {
        let _t = kernel[half][j];
        kernel[half][j] = kernel[half][h - j - 1];
        kernel[half][h - j - 1] = _t;
      }
    }
    return kernel;
  }

  function calcFPS(vector) {
    const AVERAGE_RECORDS_COUNT = 20;
    if (vector.length > AVERAGE_RECORDS_COUNT) {
      vector.shift(-1);
    } else {
      return 'NaN';
    }
    let averageTime =
      vector.reduce((pre, item) => {
        return pre + item;
      }, 0) / Math.abs(AVERAGE_RECORDS_COUNT);
    return (1000 / averageTime).toFixed(2);
  }
};


runWasm();
