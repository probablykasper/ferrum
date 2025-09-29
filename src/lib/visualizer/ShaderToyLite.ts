// github.com/chipweinberger/ShaderToyLite.js/blob/main/ShaderToyLite.js

import { create_singular_request_animation_frame } from '$lib/helpers'

export function ShaderToyLite(canvas) {
	var hdr = `#version 300 es
    #ifdef GL_ES
    precision highp float;
    precision highp int;
    precision mediump sampler3D;
    #endif
    #define texture2D texture
    uniform vec3      iResolution;           // viewport resolution (in pixels)
    uniform float     iTime;                 // shader playback time (in seconds)
    uniform float     iTimeDelta;            // render time (in seconds)
    uniform float     iFrameRate;            // shader frame rate
    uniform int       iFrame;                // shader playback frame
    uniform float     iChannelTime[4];       // channel playback time (in seconds)
    uniform vec3      iChannelResolution[4]; // channel resolution (in pixels)
    uniform vec4      iMouse;                // mouse pixel coords. xy: current (if MLB down), zw: click
    uniform sampler2D iChannel0;             // input channel 0
    uniform sampler2D iChannel1;             // input channel 1
    uniform sampler2D iChannel2;             // input channel 2
    uniform sampler2D iChannel3;             // input channel 3
    uniform vec4      iDate;                 // (year, month, day, unixtime in seconds)
    uniform float     iSampleRate;           // sound sample rate (i.e., 44100)
    uniform float     iStream;               // audio stream value
    uniform float     iVolume;               // audio volume value
    out vec4          frag_out_color;
    void mainImage( out vec4 c, in vec2 f );
    void main( void )
    {
        vec4 color = vec4(0.0,0.0,0.0,0.0);
        mainImage( color, gl_FragCoord.xy );
        frag_out_color = vec4(color);
    }
    `

	const basic_vertex_shader = `#version 300 es
    #ifdef GL_ES
    precision highp float;
    precision highp int;
    precision mediump sampler3D;
    #endif
    in vec2 vertexInPosition;
    void main() {
        gl_Position = vec4(vertexInPosition, 0.0, 1.0);
    }
    `

	const quad_vertices = new Float32Array([
		-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0,
	])

	var opts = {
		alpha: false,
		depth: false,
		stencil: false,
		premultiplied_alpha: false,
		antialias: true,
		preserve_drawing_buffer: false,
		power_preference: 'high-performance',
	}

	var gl = canvas.getContext('webgl2', opts)

	// timing
	var is_playing = false
	var first_draw_time = 0
	var prev_draw_time = 0

	// callback
	var on_draw_callback

	// uniforms
	var iframe = 0
	var imouse = { x: 0, y: 0, clickX: 0, clickY: 0 }
	var istream = 0
	var ivolume = 0

	// shader common source
	var common = ''

	// render passes variables. valid keys:
	//   'A', 'B', 'C', 'D', 'Image'
	var sourcecode = {} // fragment shader code
	var ichannels = {} // texture inputs
	var atexture = {} // front texture (input/output)
	var btexture = {} // back texture  (input/output)
	var aframebuf = {} // front buffer (output)
	var bframebuf = {} // back buffer (output)
	var program = {} // webgl program
	var fragment_shaders = {}
	var vertex_shaders = {}
	var location = {} // uniform location
	var flip = {} // a b flip
	var quad_buffer // two full screen triangles

	var setup = () => {
		gl.getExtension('OES_texture_float_linear')
		gl.getExtension('OES_texture_half_float_linear')
		gl.getExtension('EXT_color_buffer_float')
		gl.getExtension('WEBGL_debug_shaders')
		;['A', 'B', 'C', 'D', 'Image'].forEach((key) => {
			sourcecode[key] = ''
			ichannels[key] = {}
			program[key] = null
			location[key] = {}
			if (key != 'Image') {
				atexture[key] = create_texture()
				btexture[key] = create_texture()
				aframebuf[key] = create_frame_buffer(atexture[key])
				bframebuf[key] = create_frame_buffer(btexture[key])
				flip[key] = false
			}
		})

		// bind the geometry
		quad_buffer = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, quad_buffer)
		gl.bufferData(gl.ARRAY_BUFFER, quad_vertices, gl.STATIC_DRAW)

		// Set viewport size
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

		window.addEventListener('resize', function () {
			gl.canvas.width = canvas.width
			gl.canvas.height = canvas.height
			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
		})

		canvas.addEventListener('mousemove', (event) => {
			imouse.x = event.offsetX
			imouse.y = canvas.height - event.offsetY
		})

		canvas.addEventListener('mousedown', (event) => {
			imouse.clickX = event.offsetX
			imouse.clickY = canvas.height - event.offsetY
		})

		canvas.addEventListener('mouseup', () => {
			imouse.clickX = 0
			imouse.clickY = 0
		})
	}

	var create_texture = () => {
		var texture = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, texture)
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA32F,
			gl.canvas.width,
			gl.canvas.height,
			0,
			gl.RGBA,
			gl.FLOAT,
			null,
		)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		return texture
	}

	var create_frame_buffer = (texture) => {
		var framebuffer = gl.createFramebuffer()
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
		gl.bindTexture(gl.TEXTURE_2D, null)
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		return framebuffer
	}

	var compile_program = (key) => {
		// Delete previous program + shaders if they exist
		if (program[key]) {
			gl.deleteProgram(program[key])
			program[key] = null
		}
		if (vertex_shaders[key]) {
			gl.deleteShader(vertex_shaders[key])
			vertex_shaders[key] = null
		}
		if (fragment_shaders[key]) {
			gl.deleteShader(fragment_shaders[key])
			fragment_shaders[key] = null
		}

		var vert = gl.createShader(gl.VERTEX_SHADER)
		gl.shaderSource(vert, basic_vertex_shader)
		gl.compileShader(vert)

		if (!gl.getShaderParameter(vert, gl.COMPILE_STATUS)) {
			console.error('Vertex Shader compilation failed: ' + gl.getShaderInfoLog(vert))
			gl.deleteShader(vert)
			return null
		}

		var frag_source = hdr + common + sourcecode[key]
		var frag = gl.createShader(gl.FRAGMENT_SHADER)
		gl.shaderSource(frag, frag_source)
		gl.compileShader(frag)

		if (!gl.getShaderParameter(frag, gl.COMPILE_STATUS)) {
			console.error('Fragment Shader compilation failed: ' + gl.getShaderInfoLog(frag))
			console.error(frag_source)
			gl.deleteShader(frag)
			return null
		}

		var new_program = gl.createProgram()
		gl.attachShader(new_program, vert)
		gl.attachShader(new_program, frag)
		gl.linkProgram(new_program)

		gl.deleteShader(vert)
		gl.deleteShader(frag)

		if (!gl.getProgramParameter(new_program, gl.LINK_STATUS)) {
			console.error('Program initialization failed: ' + gl.getProgramInfoLog(new_program))
			return null
		}

		// uniform locations
		location[key]['iResolution'] = gl.getUniformLocation(new_program, 'iResolution')
		location[key]['iTime'] = gl.getUniformLocation(new_program, 'iTime')
		location[key]['iTimeDelta'] = gl.getUniformLocation(new_program, 'iTimeDelta')
		location[key]['iFrameRate'] = gl.getUniformLocation(new_program, 'iFrameRate')
		location[key]['iFrame'] = gl.getUniformLocation(new_program, 'iFrame')
		location[key]['iChannelTime'] = gl.getUniformLocation(new_program, 'iChannelTime[0]')
		location[key]['iChannelResolution'] = gl.getUniformLocation(
			new_program,
			'iChannelResolution[0]',
		)
		location[key]['iChannel0'] = gl.getUniformLocation(new_program, 'iChannel0')
		location[key]['iChannel1'] = gl.getUniformLocation(new_program, 'iChannel1')
		location[key]['iChannel2'] = gl.getUniformLocation(new_program, 'iChannel2')
		location[key]['iChannel3'] = gl.getUniformLocation(new_program, 'iChannel3')
		location[key]['iMouse'] = gl.getUniformLocation(new_program, 'iMouse')
		location[key]['iDate'] = gl.getUniformLocation(new_program, 'iDate')
		location[key]['iSampleRate'] = gl.getUniformLocation(new_program, 'iSampleRate')
		location[key]['iStream'] = gl.getUniformLocation(new_program, 'iStream')
		location[key]['iVolume'] = gl.getUniformLocation(new_program, 'iVolume')
		location[key]['vertexInPosition'] = gl.getAttribLocation(new_program, 'vertexInPosition')

		vertex_shaders[key] = vert
		fragment_shaders[key] = frag
		return new_program
	}

	var repeat = (times, arr) => {
		let result = []
		for (let i = 0; i < times; i++) {
			result = [...result, ...arr]
		}
		return result
	}

	var set_shader = (config, key) => {
		// Unbind before deleting
		gl.bindTexture(gl.TEXTURE_2D, null)
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		if (atexture[key]) gl.deleteTexture(atexture[key])
		if (btexture[key]) gl.deleteTexture(btexture[key])
		if (aframebuf[key]) gl.deleteFramebuffer(aframebuf[key])
		if (bframebuf[key]) gl.deleteFramebuffer(bframebuf[key])

		atexture[key] = null
		btexture[key] = null
		aframebuf[key] = null
		bframebuf[key] = null

		if (config) {
			if (config.source) {
				sourcecode[key] = config.source
				program[key] = compile_program(key)
				if (!program[key]) {
					console.error('Failed to compile ' + key)
				}
			}

			// Recreate textures/framebuffers for buffers
			if (key !== 'Image') {
				atexture[key] = create_texture()
				btexture[key] = create_texture()
				aframebuf[key] = create_frame_buffer(atexture[key])
				bframebuf[key] = create_frame_buffer(btexture[key])
				flip[key] = false
			}

			for (let i = 0; i < 4; i++) {
				var s = config[`iChannel${i}`]
				if (s == 'A' || s == 'B' || s == 'C' || s == 'D') {
					ichannels[key][i] = s
				}
			}
		} else {
			sourcecode[key] = ''
			program[key] = null
		}
	}

	var draw = () => {
		// current time
		var now = is_playing ? Date.now() : prev_draw_time
		var date = new Date(now)

		// first draw?
		if (first_draw_time == 0) {
			first_draw_time = now
		}

		// call callback
		if (on_draw_callback) {
			on_draw_callback()
		}

		// time difference between frames in seconds
		var itime_delta = (now - prev_draw_time) * 0.001

		// time in seconds
		var itime = (now - first_draw_time) * 0.001
		var idate = [date.getFullYear(), date.getMonth(), date.getDate(), date.getTime() * 0.001]

		// channel uniforms
		var ichannel_times = new Float32Array(repeat(4, [itime]))
		var ichannel_resolutions = new Float32Array(repeat(4, [gl.canvas.width, gl.canvas.height, 0]))

		;['A', 'B', 'C', 'D', 'Image'].forEach((key) => {
			if (program[key]) {
				// framebuffer
				if (key === 'Image') {
					gl.bindFramebuffer(gl.FRAMEBUFFER, null)
				} else {
					var output = flip[key] ? bframebuf[key] : aframebuf[key]
					gl.bindFramebuffer(gl.FRAMEBUFFER, output)
				}

				// textures
				for (let i = 0; i < 4; i++) {
					var chkey = ichannels[key][i]
					if (chkey) {
						var input = flip[chkey] ? atexture[chkey] : btexture[chkey]
						gl.activeTexture(gl[`TEXTURE${i}`])
						gl.bindTexture(gl.TEXTURE_2D, input)
					}
				}

				// program
				gl.useProgram(program[key])

				// uniforms
				gl.uniform3f(location[key]['iResolution'], gl.canvas.width, gl.canvas.height, 1.0)
				gl.uniform1f(location[key]['iTime'], itime)
				gl.uniform1f(location[key]['iTimeDelta'], itime_delta)
				gl.uniform1f(location[key]['iFrameRate'], 60)
				gl.uniform1i(location[key]['iFrame'], iframe)
				gl.uniform1fv(location[key]['iChannelTime'], ichannel_times)
				gl.uniform3fv(location[key]['iChannelResolution'], ichannel_resolutions)
				gl.uniform1i(location[key]['iChannel0'], 0)
				gl.uniform1i(location[key]['iChannel1'], 1)
				gl.uniform1i(location[key]['iChannel2'], 2)
				gl.uniform1i(location[key]['iChannel3'], 3)
				gl.uniform4f(location[key]['iMouse'], imouse.x, imouse.y, imouse.clickX, imouse.clickY)
				gl.uniform4f(location[key]['iDate'], idate[0], idate[1], idate[2], idate[3])
				gl.uniform1f(location[key]['iSampleRate'], 44100)
				gl.uniform1f(location[key]['iStream'], istream)
				gl.uniform1f(location[key]['iVolume'], ivolume)

				// viewport
				gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

				// vertexs
				gl.bindBuffer(gl.ARRAY_BUFFER, quad_buffer)
				gl.vertexAttribPointer(location[key]['vertexInPosition'], 2, gl.FLOAT, false, 0, 0)
				gl.enableVertexAttribArray(location[key]['vertexInPosition'])

				// draw
				gl.drawArrays(gl.TRIANGLES, 0, 6)

				flip[key] = !flip[key]
			}
		})

		// time of last draw
		prev_draw_time = now

		// frame counter
		iframe++
	}

	const raf = create_singular_request_animation_frame()

	// Animation loop
	var animate = () => {
		if (is_playing) {
			draw()
			raf(animate)
		}
	}

	this.set_common = (source) => {
		if (source === undefined) {
			source = ''
		}
		if (source === null) {
			source = ''
		}
		common = source
		;['A', 'B', 'C', 'D', 'Image'].forEach((key) => {
			if (program[key]) {
				program[key] = compile_program(key)
			}
		})
	}

	this.set_buffer_a = (config) => {
		set_shader(config, 'A')
	}

	this.set_buffer_b = (config) => {
		set_shader(config, 'B')
	}

	this.set_buffer_c = (config) => {
		set_shader(config, 'C')
	}

	this.set_buffer_d = (config) => {
		set_shader(config, 'D')
	}

	this.set_image = (config) => {
		set_shader(config, 'Image')
	}

	this.set_on_draw = (callback) => {
		on_draw_callback = callback
	}

	this.set_stream = (value) => {
		istream = value
	}

	this.set_volume = (value) => {
		ivolume = value
	}

	this.add_texture = (texture, key) => {
		if (atexture[key]) {
			gl.deleteTexture(atexture[key])
			atexture[key] = null
		}
		if (btexture[key]) {
			gl.deleteTexture(btexture[key])
			btexture[key] = null
		}
		if (aframebuf[key]) {
			gl.deleteFramebuffer(aframebuf[key])
			aframebuf[key] = null
		}
		if (bframebuf[key]) {
			gl.deleteFramebuffer(bframebuf[key])
			bframebuf[key] = null
		}
		atexture[key] = texture
		btexture[key] = texture
		flip[key] = false
	}

	this.time = () => {
		return (prev_draw_time - first_draw_time) * 0.001
	}

	this.is_playing = () => is_playing

	this.reset = () => {
		var now = new Date()
		first_draw_time = now
		prev_draw_time = now
		iframe = 0
		draw()
	}

	this.pause = () => {
		is_playing = false
	}

	this.play = () => {
		if (!is_playing) {
			is_playing = true
			var now = Date.now()
			var elapsed = prev_draw_time - first_draw_time
			first_draw_time = now - elapsed
			prev_draw_time = now
			animate()
		}
	}

	var recreate_textures = () => {
		;['A', 'B', 'C', 'D'].forEach((key) => {
			if (atexture[key]) {
				// Delete old textures
				gl.deleteTexture(atexture[key])
				gl.deleteTexture(btexture[key])
				gl.deleteFramebuffer(aframebuf[key])
				gl.deleteFramebuffer(bframebuf[key])

				// Create new textures with updated canvas size
				atexture[key] = create_texture()
				btexture[key] = create_texture()
				aframebuf[key] = create_frame_buffer(atexture[key])
				bframebuf[key] = create_frame_buffer(btexture[key])
				flip[key] = false
			}
		})
	}

	this.resize = () => {
		// Update WebGL viewport
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

		// Recreate all textures and framebuffers with new dimensions
		recreate_textures()

		// Reset timing to avoid glitches
		var now = Date.now()
		var elapsed = prev_draw_time - first_draw_time
		first_draw_time = now - elapsed
		prev_draw_time = now

		// Force a redraw
		if (!is_playing) {
			draw()
		}
	}

	this.destroy = () => {
		// Stop animation loop
		is_playing = false

		// Delete all programs and shaders
		;['A', 'B', 'C', 'D', 'Image'].forEach((key) => {
			if (program[key]) {
				gl.deleteProgram(program[key])
				program[key] = null
			}
			if (vertex_shaders[key]) {
				gl.deleteShader(vertex_shaders[key])
				vertex_shaders[key] = null
			}
			if (fragment_shaders[key]) {
				gl.deleteShader(fragment_shaders[key])
				fragment_shaders[key] = null
			}
		})

		// Delete all textures and framebuffers
		;['A', 'B', 'C', 'D'].forEach((key) => {
			if (atexture[key]) {
				gl.deleteTexture(atexture[key])
				atexture[key] = null
			}
			if (btexture[key]) {
				gl.deleteTexture(btexture[key])
				btexture[key] = null
			}
			if (aframebuf[key]) {
				gl.deleteFramebuffer(aframebuf[key])
				aframebuf[key] = null
			}
			if (bframebuf[key]) {
				gl.deleteFramebuffer(bframebuf[key])
				bframebuf[key] = null
			}
		})

		// Delete quad buffer
		if (quad_buffer) {
			gl.deleteBuffer(quad_buffer)
			quad_buffer = null
		}

		// Clear event listeners (store references during setup to remove them)
		// Note: These won't be removed since we don't have references to the handlers
		// If you need to remove them, store handler references in setup()

		// Lose WebGL context to free GPU memory
		const lose_context = gl.getExtension('WEBGL_lose_context')
		if (lose_context) {
			lose_context.loseContext()
		}

		// Clear callback
		on_draw_callback = null

		// Nullify gl reference
		gl = null
	}

	setup()
}
