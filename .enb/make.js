// Подключаем модули технологий
var techs = require('enb-bem-techs'),
    provide = require('enb/techs/file-provider'),
    css = require('enb/techs/css'),
    js = require('enb/techs/js');

module.exports = function(config) {

    // Настраиваем сборку бандлов
    config.node('bundles/*', function(nodeConfig) {

        // Декларируем модули технологий,
        // которые могут участвовать в сборке таргетов.
        nodeConfig.addTechs([

            // Используем базовые технологии, чтобы получить
            // список файлов, которые будут участвовать в сборке.
            [techs.levels, { levels: ['blocks'] }],   // (1) -> `?.levels`
            [provide, { target: '?.bemdecl.js' }],    // (2) -> `?.bemdecl.js`
            [techs.deps],                             // (3) `?.bemdecl.js` -> `?.deps.js`
            [techs.files],                            // (4) `?.levels` + `?.deps.js` -> `?.files`

            // Технологии принимают на вход список файлов. Таргет, в котором хранится список файлов,
            // задается опцией `filesTarget` (по умолчанию — `?.files`). Для сборки будут
            // использоваться только файлы, суффиксы которых указаны опцией `sourceSuffixes`.
            [css],     // Опция `sourceSuffixes` по умолчанию равна `['css']`
            [js]       // Опция `sourceSuffixes` по умолчанию равна `['js']`
        ]);

        // Объявляем таргеты, которые хотим собрать.
        nodeConfig.addTargets(['?.css', '?.js']);
    });
};