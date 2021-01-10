const autoPreprocess = require('svelte-preprocess')

module.exports = {
  preprocess: autoPreprocess({
    pug: {
      pretty: true,
    },
  }),
}
