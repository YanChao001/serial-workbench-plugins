# 签名目录

v1 索引是最大 1 MiB 的 UTF-8 JSON。Ed25519 签名覆盖域前缀 `serial-workbench-market-catalog-v1\n` 和原始索引字节，签名文件使用标准 Base64。客户端用预先配置的目录 ID 和 32 字节 Ed25519 公钥验证。索引使用正十进制字符串 `sequence`，有效期为 `[publishedAt, expiresAt)`。保存通过校验的 `checkpoint` 并传给下一次检查，可拒绝序号回退以及同序号下更换内容。

| 记录   | 字段                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 索引   | `schemaVersion` 为 1，另含 `catalogId`、`sequence`、`publishedAt`、`expiresAt` 和 `packages`。                                                   |
| 插件   | `id`、`name`、`description`、`license`、`tags`、`releases`。可选 `rating` 包含 0 至 5 的 `score`、`count`、`observedAt` 和公开 `discussionUrl`。 |
| 版本   | `version` 为 SemVer，另含 `hostProtocolVersion`、`runtimeRef` 和 `publishedAt`。                                                                 |
| 归档   | 每个版本的 `archive` 含公开 HTTPS `url`、`sha256` 和 `bytes`，与提交给宿主安装的原始 ZIP 一致。                                                  |
| 包来源 | 每个版本的 `sourceApproval` 含 `source`、`keyId`、32 个字节组成的 `publicKey` 和 `publicKeySha256`，取自该版本包的签名收据。                     |

时间使用 `YYYY-MM-DDTHH:mm:ss.SSSZ`。索引发布者确认包的 ID、版本、归档与来源收据后才签发索引。安装时宿主另行校验实际 ZIP 和签名来源，并走独立的执行许可。评分关联公开讨论及采样时点，当前工具读取发布者提供的评分记录。

用仓库外的 Ed25519 私钥文件签发，输出新建的签名文件。

```sh
node scripts/catalog.mjs sign --catalog catalog.json --signature catalog.sig --private-key /secure/publisher.pem
```

验证后检索。各搜索关键词都要命中。提供协议或运行时参数时，要求版本字段精确匹配。版本按 SemVer 降序，默认筛除预发布版，可用 `--prerelease` 放行。

```sh
node scripts/catalog.mjs search --catalog catalog.json --signature catalog.sig --catalog-id swb.market.catalog --public-key "$CATALOG_KEY_HEX" --host-protocol 0.1 --runtime node-26.13.0 --text statistics
```

公钥写为 64 位小写十六进制。后续验证使用 `--checkpoint path.json` 读取上次结果中的 `checkpoint` 对象。运行 `npm test` 检查签名绑定、过期、回退、版本和兼容筛选、评分来源及格式错误。
