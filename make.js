var PATH = require('path'),
    FS = require('fs'),
    _ = require('lodash'),
    packageJson = require('../package.json'),

    checkTemplates = require('./check-templates'),

    jsLink = require('./techs/js'),
    js = require('enb/techs/js'),
    vendorJs = require('./techs/vendor'),

    borschikJs = require('enb-borschik/techs/borschik'),

    techs = require('enb-bem-techs'),

    provide = require('enb/techs/file-provider'),
    fleCopy = require('enb/techs/file-copy'),
    bhCommon = require('enb-bh/techs/bh-commonjs'),
    bemjsonToHtml = require('enb-bh/techs/bemjson-to-html'),
    jstjsFromBemjson = require('./techs/jstjs-from-bemjson'),
    cssLess = require('enb-less/techs/css-less'),
    clientsOptions = require('./client-options'),
    platformTemplates = require('./platform-templates'),

    enbSpecsExists = false,
    _clientName;

module.exports = function (config) {

    // TODO: после переименования 2day в BeeTV заменить дефолтную переменную
    _clientName = process.env.TVE_CLIENT || '2day';

    try {

        // модуль может быть не установлен так как зависимость находится в devDependences

        config.includeConfig('enb-bem-specs');

        config.module('enb-bem-specs')
            .createConfigurator('specs');

        enbSpecsExists = true;
    } catch (e) {
        console.log('not found "enb-bem-specs"');
    }

    config.mode('prestart', function () {

        // удаление папок темплейтов, у которых нет внутри bemjson файлов
        checkTemplates();
        createVendorsNode(config);

        // Нужно учитывать тот факт, что темплейты не могут,
        // на текущий момент, замисить от параметров платформы клиента и прочих
        createJstNode(config);
    });

    config.mode('dev', function () {
        createBuildNodes(config, false);
    });

    config.mode('prod', function () {
        createBuildNodes(config, true);
    });

    config.mode('vendor', function () {
        createVendorsNode(config);
    });

    config.mode('jst', function () {
        createJstNode(config);
    });

    config.mode('markup', function () {
        var buildOptions = {
            client: '2day',
            platform: 'pc',
            resolution: '1280x720',
            theme: 'default'
        };

        config.nodes('markup/*', function (nodeConfig) {

            // получение общего decl файла для всех технологий
            nodeConfig.addTechs([
                [provide, {
                    target: '?.bemjson.js'
                }],

                [techs.bemjsonToBemdecl, {
                    source: '?.bemjson.js',
                    target: '?.bemdecl.js'
                }]
            ]);

            // Сборка HTML, не зависит от и темы, по этому он собирается обособленно от js и css
            nodeConfig.addTechs([
                [techs.levels, {
                    levels: htmlLevels,
                    target: '?.levels'
                }],

                [techs.depsOld, {
                    levelsTarget: '?.levels',
                    bemdeclFile: '?.bemdecl.js',
                    target: '_?.deps.js'
                }],

                [techs.files, {
                    levelsTarget: '?.levels',
                    depsFile: '_?.deps.js',
                    filesTarget: '?.base.files',
                    dirsTarget: '?.base.dirs'
                }]
            ]);

            // Make HTML from BH & bemjsons
            nodeConfig.addTechs([
                [bhCommon, {
                    devMode: false,
                    levelsTarget: '?.levels',
                    filesTarget: '?.base.files',
                    dirsTarget: '?.base.dirs',
                    target: '?.bh.js'
                }],
                [bemjsonToHtml, {
                    levelsTarget: '?.levels',
                    bemjsonFile: '?.bemjson.js',
                    bhFile: '?.bh.js',
                    target: 'index.html'
                }]
            ]);

            // Сборка CSS:
            nodeConfig.addTechs([
                [techs.levels, {
                    levels: clientsOptions[buildOptions.client]
                        .platforms[buildOptions.platform]
                        .resolutions[buildOptions.resolution].css[['index-', buildOptions.theme, '.css'].join('')],
                    target: 'css-?.levels'
                }],

                [techs.depsOld, {
                    levelsTarget: 'css-?.levels',
                    bemdeclFile: '?.bemdecl.js',
                    target: '_css-?.deps.js'
                }],

                [techs.files, {
                    levelsTarget: 'css-?.levels',
                    depsFile: '_css-?.deps.js',
                    filesTarget: 'css-?.base.files',
                    dirsTarget:  'css-?.base.dirs'
                }],

                [cssLess, {
                    dirsTarget: 'css-?.base.dirs',
                    filesTarget: 'css-?.base.files',
                    target: '_?.css'
                }]
            ]);

            nodeConfig.addTargets([
                '_?.css',
                'index.html'
            ]);
        });
    });

};

function exists (path, isFile) {
    var stats;
    try {
        stats = FS.lstatSync(path);
        if (stats[isFile ? 'isFile' : 'isDir']()) {
            return true;
        }
    } catch(e) {
        return false;
    }
}

function existsFile (path) {
   return exists(path, true);
}

function existsDir (path) {
    return exists(path, false);
}

/**
 * Создает ENB-ноду для сборки JS фалов вендеров под систему BEM
 * @param {Object} config - конфиг ENB
 */
function createVendorsNode (config) {
    config.nodes('app/common-vendors.blocks/*', function (nodeConfig) {
        nodeConfig.addTechs([
            [techs.levels, {
                levels: [{path: config.resolvePath('app/common-vendors.blocks'), check: true}]
            }],
            [provide, {target: '?.bemdecl.js'}],
            [techs.files, {depsFile: '?.bemdecl.js'}],
            [vendorJs, {source: '?.vendor.js', target: '?.js'}]
        ]);

        nodeConfig.addTargets(['?.js']);
    });
}

/**
 * Сборка
 * @param {Object} config - конфигурация ENB
 * @param {Boolean} isProd - продакшн чборка или нет? Влияет на выходные файлы css и js
 */
function createBuildNodes (config, isProd) {

    // TODO: переделать сборку locales, сейчас сделано временное решение

    var specs,
        clientsNames = Object.keys(clientsOptions),
        bemjson = FS.readFileSync('app/pages.blocks/index/index.bemjson.js'),
        borschik = FS.readFileSync('.borschik'),
        locales = ['ru_RU.json', 'en_EN.json', 'kk_KZ.json'].map(function (locale) {
            return {
                name: locale,
                file:  FS.readFileSync(PATH.join('locales', locale))
            }
        }),
        layerProd = 'app/production.blocks';

    if (enbSpecsExists) {
        specs = config.module('enb-bem-specs')
            .createConfigurator('specs');
    }

    // Сборка похожа на принцип сборки дистрибутива как описано в
    // https://ru.bem.info/tools/bem/enb-bem-techs/build-dist/

    /*
     // Иррархия данных clientsOptions
     2day {
         pc: {
             '1280x720': {
                 js: {
                    'index-1280x720.js': [...],
                 },
                 css: {
                    'index-1280x720-common.css': [...]
                 }
             }
         }
     }
     */

    clientsNames.forEach(function(clientName) {
        var clientNode = PATH.join('bundles', clientName),
            platformsNames = Object.keys(clientsOptions[clientName].platforms);

        if (typeof _clientName === 'string' && _clientName !== clientName) {
            return;
        }

        platformsNames.forEach(function(platformName) {
            var platformNode = PATH.join(clientNode, platformName),
                platformOptions = clientsOptions[clientName].platforms[platformName],
                resolutionsOptions = platformOptions.resolutions,
                resolutionsNames = Object.keys(resolutionsOptions);

            if (enbSpecsExists) {

                // llooop by js

                resolutionsNames.forEach(function (resolution) {
                    var optionsOfResolution = resolutionsOptions[resolution];

                    // Сборка JS:
                    Object.keys(optionsOfResolution.js).forEach(function (target) {
                        var layers = [
                            'app.specs/core.blocks',
                            'app.specs/view.blocks'
                        ].concat(
                            optionsOfResolution.js[target].concat(isProd ? [layerProd] : [])
                        );

                        specs.configure({
                            destPath: PATH.join('specs', clientName, platformName),
                            levels: layers,
                            sourceLevels: [
                                { path: 'libs/bem-pr/spec.blocks', check: false }
                            ].concat(layers),
                            engine: {
                                name: 'bh',
                                tech: require('enb-bh/techs/bh-bundle'),
                                bemjsonTech: require('enb-bh/techs/bemjson-to-html'),
                                options: {
                                    mimic: 'BEMHTML',
                                    bhOptions: {
                                        jsAttrName: 'data-bem',
                                        jsAttrScheme: 'json'
                                    }
                                }
                            },
                            jsSuffixes: ['js'],
                            specSuffixes: ['spec.js']
                        });

                    });
                });
            }

            config.node(platformNode, function (nodeConfig) {
                var pathBemJson = PATH.join(nodeConfig._path, 'index.bemjson.js'),
                    pathBorschik = PATH.join(nodeConfig._path, '.borschik');

                // Копирование bemjson.js файла для всех новосозданных нод
                // с блокированием повторного создания при запущенном enb-server
                // needCopyIndexBemjson = false - блокирует копирование
                if (platformOptions.needCopyIndexBemjson) {

                    if (!existsFile(pathBemJson)) {
                        try {
                            FS.writeFileSync(pathBemJson, bemjson);
                        } catch (e) {
                            console.log('ошибка сохранения', e);
                        }
                    }

                    if (!existsFile(pathBorschik)) {
                        try {
                            FS.writeFileSync(pathBorschik, borschik);
                        } catch (e) {
                            console.log('ошибка сохранения', e);
                        }
                    }

                    // Запись артефактов в папку с платформой, собираем только для прд версии
                    if (isProd && platformTemplates[platformName] != null) {

                        Object.keys(platformTemplates[platformName]).forEach(function (fileName) {
                            var fileBody = platformTemplates[platformName][fileName];

                            try {
                                fileBody = _.template(fileBody)({
                                    appId: 0,
                                    description: '',
                                    packageId: '', // tizen
                                    bgColor: '#000000',
                                    name: clientName.toUpperCase(),
                                    version: packageJson.version,
                                    resolution: resolutionsNames[0], // берется самое первое разрешение
                                    author: {
                                        name: 'CTI',
                                        email: 'help@cti.ru',
                                        url: 'http://www.cti.ru',
                                        organization: 'CTI'
                                    }
                                });
                            } catch (e) {
                                console.log('Ошибка apply для', fileName);
                                console.log(e);
                            }

                            FS.writeFile(PATH.resolve(nodeConfig._path, fileName), fileBody, function (err) {
                                if (err)
                                    console.log('Ошибка сохранения для', fileName);
                            });
                        });

                        platformOptions.needCopyIndexBemjson = false;
                    }

                    locales.forEach(function (locale) {
                        var path = PATH.join(nodeConfig._path, locale.name);

                        if (!existsFile(path)) {
                            try {
                                FS.writeFileSync(path, locale.file);
                            } catch (e) {
                                console.log('ошибка сохранения locale', e);
                            }
                        }
                    });

                }

                // получение общего decl файла для всех технологий
                nodeConfig.addTechs([
                    [provide, {
                        target: 'index.bemjson.js'
                    }],

                    [techs.bemjsonToBemdecl, {
                        source: 'index.bemjson.js',
                        target: 'index.bemdecl.js'
                    }]
                ]);

                // Сборка HTML
                Object.keys(platformOptions.html).forEach(function (target) {
                    var htmlLayers = platformOptions.html[target].concat(isProd ? [layerProd] : []);

                    nodeConfig.addTechs([
                        [techs.levels, {
                            levels: htmlLayers,
                            target: target + '.levels'
                        }],

                        [techs.depsOld, {
                            levelsTarget: target + '.levels',
                            bemdeclFile: 'index.bemdecl.js',
                            target: '_' + target + '.deps.js'
                        }],

                        [techs.files, {
                            levelsTarget: target + '.levels',
                            depsFile: '_' + target + '.deps.js',
                            filesTarget: target + '.base.files',
                            dirsTarget: target + '.base.dirs'
                        }]
                    ]);

                    // Make HTML from BH & bemjsons
                    nodeConfig.addTechs([
                        [bhCommon, {
                            devMode: false,
                            levelsTarget: target + '.levels',
                            filesTarget:  target + '.base.files',
                            dirsTarget: target + '.base.dirs',
                            target: target + '.bh.js'
                        }],
                        [bemjsonToHtml, {
                            levelsTarget: target + '.levels',
                            bemjsonFile: 'index.bemjson.js',
                            bhFile:  target + '.bh.js',
                            target: target
                        }]
                    ]);

                    nodeConfig.addTargets([
                        target
                    ]);
                });


                resolutionsNames.forEach(function (resolution) {
                    var optionsOfResolution = resolutionsOptions[resolution];

                    // Сборка JS:
                    Object.keys(optionsOfResolution.js).forEach(function (target) {
                        var layers = optionsOfResolution.js[target].concat(isProd ? [layerProd] : []);

                        nodeConfig.addTechs([
                            [techs.levels, {
                                levels: layers,
                                target: target + '.levels'
                            }],

                            [techs.depsOld, {
                                levelsTarget: target + '.levels',
                                bemdeclFile: 'index.bemdecl.js',
                                target: '_' + target + '.deps.js'
                            }],

                            [techs.files, {
                                levelsTarget: target + '.levels',
                                depsFile: '_' + target + '.deps.js',
                                filesTarget: target + '.base.files',
                                dirsTarget:  target + '.base.dirs'
                            }]
                        ]);

                        if (isProd) {
                            nodeConfig.addTechs([
                                [js, {
                                    dirsTarget: target + '.base.dirs',
                                    filesTarget: target + '.base.files',
                                    target: '_' + target
                                }],
                                [borschikJs, {
                                    sourceTarget: '_' + target,
                                    destTarget: target,
                                    tech: 'js',
                                    techOptions: {
                                        uglify: {
                                            output: {
                                                quote_style: 3
                                            }
                                        }
                                    },
                                    minify: true,
                                    freeze: true,
                                    noCache: true
                                }]
                            ]);
                        } else {
                            nodeConfig.addTechs([
                                [jsLink, {
                                    dirsTarget: target + '.base.dirs',
                                    filesTarget: target + '.base.files',
                                    target: target
                                }]
                            ]);
                        }

                        nodeConfig.addTargets([
                            target
                        ]);
                    });

                    // Сборка CSS:
                    Object.keys(optionsOfResolution.css).forEach(function (target) {
                        var layers = optionsOfResolution.css[target].concat(isProd ? [layerProd] : []);

                        nodeConfig.addTechs([
                            [techs.levels, {
                                levels: layers,
                                target: target + '.levels'
                            }],

                            [techs.depsOld, {
                                levelsTarget: target + '.levels',
                                bemdeclFile: 'index.bemdecl.js',
                                target: '_' + target + '.deps.js'
                            }],

                            [techs.files, {
                                levelsTarget: target + '.levels',
                                depsFile: '_' + target + '.deps.js',
                                filesTarget: target + '.base.files',
                                dirsTarget:  target + '.base.dirs'
                            }]
                        ]);

                        if (isProd) {
                            nodeConfig.addTechs([
                                [cssLess, {
                                    dirsTarget: target + '.base.dirs',
                                    filesTarget: target + '.base.files',
                                    target: '_' + target
                                }],
                                [
                                    borschikJs, {
                                    sourceTarget: '_' + target,
                                    destTarget: target,
                                    minify: true,
                                    freeze: true,
                                    noCache: true,
                                    tech: 'cleancss',
                                    techOptions: {
                                        semanticMerging: true
                                    }
                                }
                                ]
                            ]);
                        } else {
                            nodeConfig.addTechs([
                                [cssLess, {
                                    dirsTarget: target + '.base.dirs',
                                    filesTarget: target + '.base.files',
                                    target: target
                                }]
                            ]);
                        }

                        nodeConfig.addTargets([
                            target
                        ]);
                    });
                });
            });
        })
    });
}


/**
 * Создает ноду для сборки JST шаблонов сразу в JS фалы
 * @param {Object} config - конфиг ENB
 */
function createJstNode(config) {
    config.nodes('app/templates.bundles/*', function (nodeConfig) {


        // TODO: Перевсмотреть сборку jst Таким образом, чтобы собиралось с матрицей зависимостей
        // TODO: от разрешения и клиента, темы

        // Base techs
        nodeConfig.addTechs([
            [techs.levels, {
                levels: [
                    [
                        'app', nodeConfig._path.split('/')[1]].join('/'),
                        'app/core.blocks',
                        'app-2day/core.blocks',
                        'app/common.blocks',
                        'app.resolutions/1280x720.blocks',
                        'app/view.blocks',
                        'app/scenes.blocks',
                        'app-2day/scenes.blocks',
                        'app/pages.blocks',
                        'app/menu-sections.blocks'
                    ],
                target: '?.levels'
            }]
        ]);

        // JST
        nodeConfig.addTechs([
            [provide, {
                target: '?.bemjson.js'
            }],

            [techs.bemjsonToBemdecl,  {
                source: '?.bemjson.js',
                target: '?.jst-bemjson.bemdecl.js'
            }],

            [techs.depsOld, {
                levelsTarget: '?.levels',
                bemdeclFile: '?.jst-bemjson.bemdecl.js',
                target: '_?.jst-deps.js'
            }],

            [techs.files, {
                levelsTarget: '?.levels',
                depsFile: '_?.jst-deps.js',
                filesTarget: '?.jst-bh.files',
                dirsTarget: '?.jst-bh.dirs'
            }],

            // сборка всех bh файлов в один, нужно учесть что bh в бандле не берется в сборку
            [bhCommon, {
                devMode: false,
                filesTarget: '?.jst-bh.files',
                dirsTarget: '?.jst-bh.dirs',
                target: '?.jst-bh.js'
            }],

            // обработка bemjson через собранный bh в HTML
            [jstjsFromBemjson, {
                bemjsonFile: '?.bemjson.js',
                bhFile: '?.jst-bh.js',
                target: '?.js'
            }]
        ]);

        nodeConfig.addTargets([
            '?.js'
        ]);
    });
}
