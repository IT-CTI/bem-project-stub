module.exports = function (bh) {

    bh.match('page', function (ctx, json) {

        ctx
            .tag('body')
            .content([
                ctx.content(),
                json.scripts
            ], true);

        return [
            {block: 'doctype'},
            {
                block: 'html',
                content: [
                    {
                        block: 'head',
                        content: [
                                {elem: 'meta', attrs: {charset: 'utf-8'}},
                                {tag: 'title', content: json.title}
                            ].concat(ctx.param('withoutConfig') ? [] : [
                                {block: 'config'},
                                {block: 'delete-cookies'}
                            ]).concat([
                                json.head,
                                json.styles,
                                json.favicon ? {elem: 'favicon', url: json.favicon} : ''
                            ])

                    },
                    json
                ]
            }
        ];
    });

    bh.match('doctype', function (ctx) {
        ctx.tag(null);
        ctx.content('<!DOCTYPE html>');
    });

    bh.match('html', function (ctx) {
        ctx.bem(false).tag('html').attrs({
            'http-equiv': 'Content-Type',
            content: 'application/ce-html+xml; charset=utf-8; supportspointer=true'
        });
    });

    bh.match('head', function (ctx) {
        ctx.bem(false).tag('head');
    });

    bh.match('head__meta', function (ctx) {
        ctx.bem(false).tag('meta');
    });

    bh.match('head__link', function (ctx) {
        ctx.bem(false).tag('link');
    });

    bh.match('head__favicon', function (ctx, json) {
        ctx
            .bem(false)
            .tag('link')
            .attr('rel', 'shortcut icon')
            .attr('href', json.url);
    });

    bh.match('head__css', function (ctx, json) {
        ctx.bem(false);

        if (json.url) {
            ctx
                .tag('link')
                .attr('rel', 'stylesheet')
                .attr('type', 'text/css')
                .attr('href', json.url);
        } else {
            ctx.tag('style');
        }

    });

    bh.match('page__js', function (ctx, json) {
        ctx
            .bem(false)
            .tag('script');
        json.url && ctx.attr('src', json.url);
    });

    bh.match('head__js', function (ctx, json) {
        ctx
            .bem(false)
            .tag('script');
        json.url && ctx.attr('src', json.url);
    });

    bh.match('head__config', function (ctx) {
        var config = ctx.param('config');

        ctx.tag(null)
            .content({
                tag: null,
                block: 'head',
                elem: 'include_js',
                content: [
                    {
                        block: 'head',
                        elem: 'js',
                        content: '(function(global) { global.config =' + JSON.stringify(config) + '; })(window);'
                    },
                    {
                        block: 'head',
                        elem: 'js',
                        url: config.host + '/portal-facade-ng/v1/stb/systemConfig'
                    }
                ]
            });
    });

};
