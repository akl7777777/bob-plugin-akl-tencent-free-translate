var config = require('./config.js');
var utils = require('./utils.js');

function supportLanguages() {
    return config.supportedLanguages.map(([standardLang]) => standardLang);
}

async function login() {
    try {
        return await $http.request({
            method: "POST",
            url: "https://fanyi.qq.com/api/reauth12f",
            header: {},
            body: {}
        });
    } catch (e) {
        $log.error('接口请求错误 ==> ' + JSON.stringify(e))
        Object.assign(e, {
            _type: 'network',
            _message: '接口请求错误 - ' + JSON.stringify(e),
        });
        throw e;
    }
}

async function _translate(source, target, sourceText, qtv, qtk) {
    const sessionUuid = 'translate_uuid' + new Date().getTime()
    $log.error('接口请求错误 参数 ==> ' + JSON.stringify({
        "source": source,
        "target": target,
        "sourceText": sourceText,
        "qtv": qtv,
        "qtk": qtk,
        "sessionUuid": sessionUuid
    }))

    try {

        return await $http.request({
            method: "POST",
            url: "https://fanyi.qq.com/api/translate",
            header: {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
            body: {
                "source": source,
                "target": target,
                "sourceText": sourceText,
                "qtv": qtv,
                "qtk": qtk,
                "sessionUuid": sessionUuid
            }
        });
    } catch (e) {
        $log.error('接口请求错误 ==> ' + JSON.stringify(e))
        Object.assign(e, {
            _type: 'network',
            _message: '接口请求错误 - ' + JSON.stringify(e),
        });
        throw e;
    }
}

async function __translate(source, target, sourceText) {
    try {
        return await $http.request({
            method: "GET",
            url: "https://wxapp.translator.qq.com/api/translate",
            header: {
                "content-type": "application/json",
                "Host": "wxapp.translator.qq.com",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.32(0x18002035) NetType/WIFI Language/zh_TW",
                "Referer": "https://servicewechat.com/wxb1070eabc6f9107e/117/page-frame.html"
            },
            body: {
                "source": 'auto',
                "target": 'auto',
                "sourceText": sourceText,
                "platform": "WeChat_APP",
                "candidateLangs": source + '|' + target,
                "guid": "oqdgX0SIwhvM0TmqzTHghWBvfk22"
            }
        });
    } catch (e) {
        $log.error('接口请求错误 ==> ' + JSON.stringify(e))
        Object.assign(e, {
            _type: 'network',
            _message: '接口请求错误 - ' + JSON.stringify(e),
        });
        throw e;
    }
}

function readFile(filePath) {
    if ($file.exists(filePath)) {
        return $file.read(filePath).toUTF8()
    }
    return ''
}

function translate(query, completion) {
    (async () => {
        const targetLanguage = utils.langMap.get(query.detectTo);
        const sourceLanguage = utils.langMap.get(query.detectFrom);
        if (!targetLanguage) {
            const err = new Error();
            Object.assign(err, {
                _type: 'unsupportLanguage',
                _message: '不支持该语种',
            });
            throw err;
        }
        const source_lang = sourceLanguage || 'en';
        let target_lang = targetLanguage || 'zh';
        // 腾讯翻译君无法进行目标语言自动检测，所以需要手动指定
        if (target_lang === 'auto') {
            target_lang = 'zh'
        }
        const translate_text = query.text || '';
        if (translate_text !== '') {
            try {
                // 无法进行同语言翻译,会报错,所以判断后直接返回原文
                if (source_lang === target_lang) {
                    completion({
                        result: {
                            from: query.detectFrom,
                            to: query.detectTo,
                            toParagraphs: translate_text.split('\n'),
                        },
                    });
                }
                const transResponse = await __translate(source_lang, target_lang, translate_text)
                if (transResponse.data && transResponse.data.targetText) {
                    completion({
                        result: {
                            from: query.detectFrom,
                            to: query.detectTo,
                            toParagraphs: transResponse.data.targetText.split('\n'),
                        },
                    });
                } else {
                    $log.error('接口请求错误 transResponse.data ==> ' + JSON.stringify(transResponse.data))
                    completion({
                        error: {
                            type: 'unknown',
                            message: transResponse.data,
                            addtion: transResponse.data,
                        },
                    });
                }
            } catch (e) {
                $log.error('接口请求错误 ==> ' + JSON.stringify(e))
                Object.assign(e, {
                    _type: 'network',
                    _message: '接口请求错误 - ' + JSON.stringify(e),
                });
                throw e;
            }
        }
    })().catch((err) => {
        completion({
            error: {
                type: err._type || 'unknown',
                message: err._message || '未知错误',
                addtion: err._addtion,
            },
        });
    });
}

exports.supportLanguages = supportLanguages;
exports.translate = translate;
