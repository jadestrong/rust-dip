use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn console_log_from_wasm(input_string: String) {
    let result = format!("{}", input_string);
    log(&result);
}

const KW: usize = 3;
const KH: usize = 3;

const KERNEL_SIZE: usize = KW * KH;
const DATA_SIZE: usize = 921600;

static mut KERNER_BUFFER: [i8; KERNEL_SIZE] = [0; KERNEL_SIZE];
static mut INPUT_BUFFER: [u8; DATA_SIZE] = [0; DATA_SIZE];

#[wasm_bindgen]
pub fn get_kernel_ptr() -> *const i8 {
    let pointer: *const i8;
    unsafe {
        pointer = KERNER_BUFFER.as_ptr();
    }

    pointer
}

#[wasm_bindgen]
pub fn get_input_buffer_ptr() -> *const u8 {
    let pointer: *const u8;
    unsafe {
        pointer = INPUT_BUFFER.as_ptr();
    }

    pointer
}

#[wasm_bindgen]
pub fn conv_filter(
    width: usize,
    height: usize,
    divisor: i8
) {
    let half = KH / 2;
    for y in half..height-half {
        for x in half.. width-half {
            let px = (y * width + x) * 4;
            let mut r: i32 = 0;
            let mut g: i32 = 0;
            let mut b: i32 = 0;
            for cy in 0..KH {
                for cx in 0..KW {
                    let idx = get_kernel_index(cx, cy);
                    let cpx = ((y + (cy - half)) * width + (x + (cx - half))) * 4;
                    unsafe {
                        r += INPUT_BUFFER[cpx + 0] as i32 * KERNER_BUFFER[idx] as i32;
                        g += INPUT_BUFFER[cpx + 1] as i32 * KERNER_BUFFER[idx] as i32;
                        b += INPUT_BUFFER[cpx + 2] as i32 * KERNER_BUFFER[idx] as i32;
                    }
                }
            }
            unsafe {
                INPUT_BUFFER[px + 0] = if r / divisor as i32 > 255 { 255 } else if r / (divisor as i32) < 0 { 0 } else { (r / divisor as i32) as u8 };
                INPUT_BUFFER[px + 1] = if g / divisor as i32 > 255 { 255 } else if g / (divisor as i32) < 0 { 0 } else { (g / divisor as i32) as u8 };
                INPUT_BUFFER[px + 2] = if b / divisor as i32 > 255 { 255 } else if b / (divisor as i32) < 0 { 0 } else { (b / divisor as i32) as u8 };
            }
        }
    }
}

fn get_kernel_index(x: usize, y: usize) -> usize {
    y * KW + x
}
