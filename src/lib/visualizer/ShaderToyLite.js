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

	var basicFragShader = `void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
        fragColor = texture2D(iChannel0, gl_FragCoord.xy / iResolution.xy);
    }
    `

	const basicVertexShader = `#version 300 es
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

	const quadVertices = new Float32Array([
		-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0,
	])

	var opts = {
		alpha: false,
		depth: false,
		stencil: false,
		premultipliedAlpha: false,
		antialias: true,
		preserveDrawingBuffer: false,
		powerPreference: 'high-performance',
	}

	var gl = canvas.getContext('webgl2', opts)

	// timing
	var isPlaying = false
	var firstDrawTime = 0
	var prevDrawTime = 0

	// callback
	var onDrawCallback

	// uniforms
	var iFrame = 0
	var iMouse = { x: 0, y: 0, clickX: 0, clickY: 0 }
	var iStream = 0
	var iVolume = 0

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
	var fragmentShaders = {}
	var vertexShaders = {}
	var location = {} // uniform location
	var flip = {} // a b flip
	var quadBuffer // two full screen triangles

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
				atexture[key] = createTexture()
				btexture[key] = createTexture()
				aframebuf[key] = createFrameBuffer(atexture[key])
				bframebuf[key] = createFrameBuffer(btexture[key])
				flip[key] = false
			}
		})

		// bind the geometry
		quadBuffer = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
		gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW)

		// Set viewport size
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

		window.addEventListener('resize', function () {
			gl.canvas.width = canvas.width
			gl.canvas.height = canvas.height
			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
		})

		canvas.addEventListener('mousemove', (event) => {
			iMouse.x = event.offsetX
			iMouse.y = canvas.height - event.offsetY
		})

		canvas.addEventListener('mousedown', (event) => {
			iMouse.clickX = event.offsetX
			iMouse.clickY = canvas.height - event.offsetY
		})

		canvas.addEventListener('mouseup', () => {
			iMouse.clickX = 0
			iMouse.clickY = 0
		})
	}

	var createTexture = () => {
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

	var createFrameBuffer = (texture) => {
		var framebuffer = gl.createFramebuffer()
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
		gl.bindTexture(gl.TEXTURE_2D, null)
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		return framebuffer
	}

	var compileProgram = (key) => {
		// Delete previous program + shaders if they exist
		if (program[key]) {
			gl.deleteProgram(program[key])
			program[key] = null
		}
		if (vertexShaders[key]) {
			gl.deleteShader(vertexShaders[key])
			vertexShaders[key] = null
		}
		if (fragmentShaders[key]) {
			gl.deleteShader(fragmentShaders[key])
			fragmentShaders[key] = null
		}

		var vert = gl.createShader(gl.VERTEX_SHADER)
		gl.shaderSource(vert, basicVertexShader)
		gl.compileShader(vert)

		if (!gl.getShaderParameter(vert, gl.COMPILE_STATUS)) {
			console.error('Vertex Shader compilation failed: ' + gl.getShaderInfoLog(vert))
			gl.deleteShader(vert)
			return null
		}

		var fragSource = hdr + common + sourcecode[key]
		var frag = gl.createShader(gl.FRAGMENT_SHADER)
		gl.shaderSource(frag, fragSource)
		gl.compileShader(frag)

		if (!gl.getShaderParameter(frag, gl.COMPILE_STATUS)) {
			console.error('Fragment Shader compilation failed: ' + gl.getShaderInfoLog(frag))
			console.error(fragSource)
			gl.deleteShader(frag)
			return null
		}

		var newProgram = gl.createProgram()
		gl.attachShader(newProgram, vert)
		gl.attachShader(newProgram, frag)
		gl.linkProgram(newProgram)

		gl.deleteShader(vert)
		gl.deleteShader(frag)

		if (!gl.getProgramParameter(newProgram, gl.LINK_STATUS)) {
			console.error('Program initialization failed: ' + gl.getProgramInfoLog(newProgram))
			return null
		}

		// uniform locations
		location[key]['iResolution'] = gl.getUniformLocation(newProgram, 'iResolution')
		location[key]['iTime'] = gl.getUniformLocation(newProgram, 'iTime')
		location[key]['iTimeDelta'] = gl.getUniformLocation(newProgram, 'iTimeDelta')
		location[key]['iFrameRate'] = gl.getUniformLocation(newProgram, 'iFrameRate')
		location[key]['iFrame'] = gl.getUniformLocation(newProgram, 'iFrame')
		location[key]['iChannelTime'] = gl.getUniformLocation(newProgram, 'iChannelTime[0]')
		location[key]['iChannelResolution'] = gl.getUniformLocation(newProgram, 'iChannelResolution[0]')
		location[key]['iChannel0'] = gl.getUniformLocation(newProgram, 'iChannel0')
		location[key]['iChannel1'] = gl.getUniformLocation(newProgram, 'iChannel1')
		location[key]['iChannel2'] = gl.getUniformLocation(newProgram, 'iChannel2')
		location[key]['iChannel3'] = gl.getUniformLocation(newProgram, 'iChannel3')
		location[key]['iMouse'] = gl.getUniformLocation(newProgram, 'iMouse')
		location[key]['iDate'] = gl.getUniformLocation(newProgram, 'iDate')
		location[key]['iSampleRate'] = gl.getUniformLocation(newProgram, 'iSampleRate')
		location[key]['iStream'] = gl.getUniformLocation(newProgram, 'iStream')
		location[key]['iVolume'] = gl.getUniformLocation(newProgram, 'iVolume')
		location[key]['vertexInPosition'] = gl.getAttribLocation(newProgram, 'vertexInPosition')

		vertexShaders[key] = vert
		fragmentShaders[key] = frag
		return newProgram
	}

	var repeat = (times, arr) => {
		let result = []
		for (let i = 0; i < times; i++) {
			result = [...result, ...arr]
		}
		return result
	}

	var setShader = (config, key) => {
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
				program[key] = compileProgram(key)
				if (!program[key]) {
					console.error('Failed to compile ' + key)
				}
			}

			// Recreate textures/framebuffers for buffers
			if (key !== 'Image') {
				atexture[key] = createTexture()
				btexture[key] = createTexture()
				aframebuf[key] = createFrameBuffer(atexture[key])
				bframebuf[key] = createFrameBuffer(btexture[key])
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
		var now = isPlaying ? Date.now() : prevDrawTime
		var date = new Date(now)

		// first draw?
		if (firstDrawTime == 0) {
			firstDrawTime = now
		}

		// call callback
		if (onDrawCallback) {
			onDrawCallback()
		}

		// time difference between frames in seconds
		var iTimeDelta = (now - prevDrawTime) * 0.001

		// time in seconds
		var iTime = (now - firstDrawTime) * 0.001
		var iDate = [date.getFullYear(), date.getMonth(), date.getDate(), date.getTime() * 0.001]

		// channel uniforms
		var iChannelTimes = new Float32Array(repeat(4, [iTime]))
		var iChannelResolutions = new Float32Array(repeat(4, [gl.canvas.width, gl.canvas.height, 0]))

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
				gl.uniform1f(location[key]['iTime'], iTime)
				gl.uniform1f(location[key]['iTimeDelta'], iTimeDelta)
				gl.uniform1f(location[key]['iFrameRate'], 60)
				gl.uniform1i(location[key]['iFrame'], iFrame)
				gl.uniform1fv(location[key]['iChannelTime'], iChannelTimes)
				gl.uniform3fv(location[key]['iChannelResolution'], iChannelResolutions)
				gl.uniform1i(location[key]['iChannel0'], 0)
				gl.uniform1i(location[key]['iChannel1'], 1)
				gl.uniform1i(location[key]['iChannel2'], 2)
				gl.uniform1i(location[key]['iChannel3'], 3)
				gl.uniform4f(location[key]['iMouse'], iMouse.x, iMouse.y, iMouse.clickX, iMouse.clickY)
				gl.uniform4f(location[key]['iDate'], iDate[0], iDate[1], iDate[2], iDate[3])
				gl.uniform1f(location[key]['iSampleRate'], 44100)
				gl.uniform1f(location[key]['iStream'], iStream)
				gl.uniform1f(location[key]['iVolume'], iVolume)

				// viewport
				gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

				// vertexs
				gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
				gl.vertexAttribPointer(location[key]['vertexInPosition'], 2, gl.FLOAT, false, 0, 0)
				gl.enableVertexAttribArray(location[key]['vertexInPosition'])

				// draw
				gl.drawArrays(gl.TRIANGLES, 0, 6)

				flip[key] = !flip[key]
			}
		})

		// time of last draw
		prevDrawTime = now

		// frame counter
		iFrame++
	}

	const raf = create_singular_request_animation_frame()

	// Animation loop
	var animate = () => {
		if (isPlaying) {
			draw()
			raf(animate)
		}
	}

	this.setCommon = (source) => {
		if (source === undefined) {
			source = ''
		}
		if (source === null) {
			source = ''
		}
		common = source
		;['A', 'B', 'C', 'D', 'Image'].forEach((key) => {
			if (program[key]) {
				program[key] = compileProgram(key)
			}
		})
	}

	this.setBufferA = (config) => {
		setShader(config, 'A')
	}

	this.setBufferB = (config) => {
		setShader(config, 'B')
	}

	this.setBufferC = (config) => {
		setShader(config, 'C')
	}

	this.setBufferD = (config) => {
		setShader(config, 'D')
	}

	this.setImage = (config) => {
		setShader(config, 'Image')
	}

	this.setOnDraw = (callback) => {
		onDrawCallback = callback
	}

	this.setStream = (value) => {
		iStream = value
	}

	this.setVolume = (value) => {
		iVolume = value
	}

	this.addTexture = (texture, key) => {
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
		return (prevDrawTime - firstDrawTime) * 0.001
	}

	this.isPlaying = () => isPlaying

	this.reset = () => {
		var now = new Date()
		firstDrawTime = now
		prevDrawTime = now
		iFrame = 0
		draw()
	}

	this.pause = () => {
		isPlaying = false
	}

	this.play = () => {
		if (!isPlaying) {
			isPlaying = true
			var now = Date.now()
			var elapsed = prevDrawTime - firstDrawTime
			firstDrawTime = now - elapsed
			prevDrawTime = now
			animate()
		}
	}

	var recreateTextures = () => {
		;['A', 'B', 'C', 'D'].forEach((key) => {
			if (atexture[key]) {
				// Delete old textures
				gl.deleteTexture(atexture[key])
				gl.deleteTexture(btexture[key])
				gl.deleteFramebuffer(aframebuf[key])
				gl.deleteFramebuffer(bframebuf[key])

				// Create new textures with updated canvas size
				atexture[key] = createTexture()
				btexture[key] = createTexture()
				aframebuf[key] = createFrameBuffer(atexture[key])
				bframebuf[key] = createFrameBuffer(btexture[key])
				flip[key] = false
			}
		})
	}

	this.resize = () => {
		// Update WebGL viewport
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

		// Recreate all textures and framebuffers with new dimensions
		recreateTextures()

		// Reset timing to avoid glitches
		var now = Date.now()
		var elapsed = prevDrawTime - firstDrawTime
		firstDrawTime = now - elapsed
		prevDrawTime = now

		// Force a redraw
		if (!isPlaying) {
			draw()
		}
	}

	this.destroy = () => {
		// Stop animation loop
		isPlaying = false

		// Delete all programs and shaders
		;['A', 'B', 'C', 'D', 'Image'].forEach((key) => {
			if (program[key]) {
				gl.deleteProgram(program[key])
				program[key] = null
			}
			if (vertexShaders[key]) {
				gl.deleteShader(vertexShaders[key])
				vertexShaders[key] = null
			}
			if (fragmentShaders[key]) {
				gl.deleteShader(fragmentShaders[key])
				fragmentShaders[key] = null
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
		if (quadBuffer) {
			gl.deleteBuffer(quadBuffer)
			quadBuffer = null
		}

		// Clear event listeners (store references during setup to remove them)
		// Note: These won't be removed since we don't have references to the handlers
		// If you need to remove them, store handler references in setup()

		// Lose WebGL context to free GPU memory
		const loseContext = gl.getExtension('WEBGL_lose_context')
		if (loseContext) {
			loseContext.loseContext()
		}

		// Clear callback
		onDrawCallback = null

		// Nullify gl reference
		gl = null
	}

	setup()
}
