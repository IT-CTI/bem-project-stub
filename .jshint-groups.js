module.exports = {
    options : {
        boss : true,
        eqeqeq : true,
        evil : true,
        expr : true,
        eqnull: true,
        forin : true,
        immed : true,
        loopfunc : true,
        maxdepth : 4,
        maxlen : 120,
        noarg : true,
        noempty : true,
        onecase : true,
        quotmark : 'single',
        sub : true,
        supernew : true,
        undef : true,
        unused : true
    },

    groups : {
        browserjs : {
            options : {
                browser : true,
                predef : ['modules']
            },
            includes : ['app.blocks/**/*.js'],
            excludes : [
                'app.blocks/**/*.i18n/*.js',
                'app.blocks/**/*.bem/*.js',
                'app.blocks/**/_*.js',
                'app.blocks/**/*.bh.js',
                'app.blocks/**/*.spec.js',
                'app.blocks/**/*.deps.js',
                'app.blocks/**/*.bemjson.js',
                'app.blocks/**/*.bemdecl.js',
                'app.blocks/**/*.libs.js'
            ]
        },

        specjs : {
            options : {
                browser : true,
                maxlen : 150,
                predef : [
                    'modules',
                    'describe',
                    'it',
                    'before',
                    'beforeEach',
                    'after',
                    'afterEach'
                ]
            },
            includes : ['app.blocks/**/*.spec.js']
        },

        bemhtml : {
            options : {
                predef : [
                    'apply',
                    'applyCtx',
                    'applyNext',
                    'attrs',
                    'bem',
                    'block',
                    'cls',
                    'content',
                    'def',
                    'elem',
                    'js',
                    'local',
                    'match',
                    'mix',
                    'mod',
                    'mode',
                    'tag'
                ]
            },
            includes : ['app.blocks/**/*.bemhtml']
        },

        bhjs : {
            options : {
                node : true
            },
            includes : [
                'app.blocks/**/*.bh.js'
            ]
        },

        bemjsonjs : {
            options : {
                asi : true,
                predef: [
                    'module'
                ]
            },
            includes : ['bundles/**/*.bemjson.js']
        },

        nodejs : {
            options : {
                node : true
            },
            excludes : [
                'app/.bem/',
                'app/**/.bem/',
                'libs/**',
                'lib/**',
                'node_modules/**'
            ]
        }
    }
};
