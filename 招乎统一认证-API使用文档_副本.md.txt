[//]:#DisplayInOneLine

# 统一认证服务-基础说明

## HTTP请求签名

为了提高接口调用的安全性，调用一号通开放api前需要对接口进行签名，目前默认采用国密算法SM3做摘要，国密算法SM2SignWithSM3做签名。

### 签名规则说明

1. 构造待签名字符串   
   
    待签名字符串是由http请求相关信息组成的用于签名的原始字符串，其格式如下：
   
   ```
   Method + \n
   Headers + \n
   X-Content + \n
   Queries
   ```
   
    主要包含请求方法、请求头、请求体和查询参数内容，每一部分之间通过换行符\n拼接，以下是每一部分的详细说明。    
    (1) Method      
      Method为请求方法的大写，例如POST、GET     
    (2) Headers     
      Headers由需要签名的请求头的键值拼接而来，其格式如下：
   
   ```
   key:value + \n
   key:value + \n
   ...
   ```
   
    key请求头的名称，value为请求的值，如果value为空，则需要保留冒号，每一行通过换行符\n结尾，最后一行不需要换行符（因为整个Headers的最后已经有一个换行符了），必须签名的请求头有以下五项：
   
   ```
   Accept：如果为空，默认指定为*/*
   Contet-Type: 值可以为空
   X-ClientId：在一事通统一认证中心注册的应用id
   X-Nonce：系统生成的随机字符串，用于防重放攻击
   X-TimeStamp：请求发起时的时间戳，为当前调用时间距离1970年1月1日的毫秒数，超过一定时长的请求将被服务端拒绝
   ```
   
   除了以上五项必须签名的请求头外，用户也可以添加额外的请求头，最终所有参与签名的Header都需要通过X-Signature-Headers请求头进行说明。        
    (3) X-Content       
     X-Content为请求体的hash值，默认采用国密SM3算法，如果该请求没有body，该行可以为空，但必须保留换行符\n。        
    (4) Queries         
     Queries为跟在url后面的查询参数，按照key1=value1&key2=value2的格式拼接。

2. 生成签名    
   
    将上一步得到的待签名字符串采用国密SM2SignWithSM3算法进行签名，将结果转为Base64编码字符串即为签名结果。    

3. 为请求添加Header    
    得到签名结果后，将相应的内容添加到请求头中，即完成了整个请求的加签，需要添加的Header有以下几项：
   
   ```
   Accept: 用于生成签名的Accept，如果为空则默认为*/*
   X-ClientId: 客户端标识
   X-TimeStamp: 用于生成签名的时间戳
   X-Nonce: 用于生成签名的随机串
   X-Signature-Headers: 用于生成签名的请求头，采用逗号分隔，如Accept,Content-Type,X-ClientId,X-Nonce,X-TimeStamp
   X-Content: 用于生成签名的请求体Hash值，形如6BfpYzJ8z+6JJ0gp9t+TGjwL+Ks9OtmhiNagQGePCCs=
   X-Signature: 最终的签名结果字符串，形如jXq2vpWdQ0tjjJF5/G+6sGD3tlB8mbqDYcr5LgOGj99hDPCKXFX+Ugbg9oVtR3icBQ0BUs9RIJJ1W1ImZNjJTA==
   ```
   
    将以上请求头添加到http请求中，然后发送请求访问api即完成请求加签。

# 统一认证服务-接口

## 统一认证各环境域名

| 环境       | 域名地址            |
|:-------- |:--------------- |
| 测试       | http://test.cn/ |
| 生产（BIZ区） | http://oa.cn/   |

## 单点登录接口

单点登录接口，采用OpenId Connect (基于OAuth2)协议，通过前端跳转单点登录接口获取登录授权码。

### 调用方式

+ TYPE: HTTP

+ URI: `{域名}/auth-server/auth?client_id=xxx&response_type=code&redirect_uri=xxx&scope=xxx&state=xxx`

+ METHOD: GET

### 输入参数

+ MODEL: request

| 参数            | 类型     | 必须字段 | 说明                                   |
| ------------- | ------ | ---- | ------------------------------------ |
| client_id     | string | 是    | 客户端应用32位id                           |
| response_type | string | 否    | 固定值code                              |
| redirect_uri  | string | 否    | 登录成功后的回跳地址，用于接收授权码，需要通过urlencode编码处理 |
| scope         | string | 否    | 申请授权范围                               |
| state         | string | 否    | 随机值                                  |

### 输出参数

返回授权码，附带在redirectUri的code参数中 `{redirect_uri}?code=xxxxxxxxx&state=xxxxxxxx`

### 返回码

HTTP协议标准状态码

## TOKEN获取接口

Token获取接口用提供OAuth2协议中的AccessToken获取，目前支持授权码模式和客户端凭据模式。调用该接口需要采用国密算法SM2SignWithSM3对接口进行签名，参考签名方式说明。

### 调用方式

+ TYPE: HTTP

+ URI: `{域名}/auth-server/token?client_id=xxxxxx&code=xxxxxxx&grant_type=xx`

+ METHOD: POST

### 输入参数

+ 授权码模式

| 参数         | 类型     | 必须字段 | 说明                     |
| ---------- | ------ | ---- | ---------------------- |
| client_id  | string | 是    | 客户端应用32位id值            |
| grant_type | string | 是    | 固定值：authorization_code |
| code       | string | 是    | 通过单点登录接口获取的授权码         |
| 签名参数       | -      | 是    | 用于校验应用身份，参考第一章Http请求签名 |

+ 客户端凭据

| 参数         | 类型     | 必须字段 | 说明                     |
| ---------- | ------ | ---- | ---------------------- |
| client_id  | string | 是    | 客户端应用32位id值            |
| grant_type | string | 是    | 固定值：client_credentials |
| 签名参数       | -      | 是    | 用于校验应用身份，参考第一章Http请求签名 |

### 输出参数

+ response

| 参数            | 类型     | 必须字段         | 说明                    |
| ------------- | ------ | ------------ | --------------------- |
| access_token  | jwt    | 是            | 用于后续调用其他接口的凭据         |
| refresh_token | jwt    | 是            | 用于刷新access_token      |
| id_token      | jwt    | 否，仅在授权码模式中存在 | 用于解析后获得当前的登录用户信息      |
| token_type    | string | 是            | 固定值：Bearer            |
| expires_in    | string | 数            | accessToken的有效期时长，单位秒 |

### 返回码

HTTP协议标准状态码

### 备注

#### Token使用说明

1.格式说明

   其中id_token采用jwt格式，其中payload主要包含以下内容：

| 参数               | 类型     | 说明                                                                                                                    |
| ---------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| userName         | string | 用户名                                                                                                                   |
| openId           | string | openId                                                                                                                |
| employeeId       | string | 员工编号                                                                                                                  |
| userType         | string | 用户类型（招商银行）：1（行员），2（子公司员工），3（总行IT外包），9（默认用户），98（实习生），99（数据中心合作方），110（信用卡中心IT外包员工），120（网经服合作方）                          |
| platformUserType | string | 账号类型：0（SAP关联账号），1（独立账号），2（临时账号），9（虚拟账号）                                                                               |
| orgName          | string | 机构名称                                                                                                                  |
| orgId            | string | 机构id                                                                                                                  |
| originOrgId      | string | 原始机构Id(6位)                                                                                                            |
| pathName         | string | 机构路径                                                                                                                  |
| pathId           | string | 机构路径id                                                                                                                |
| originPathId     | string | 原始机构路径Id(6位)                                                                                                          |
| enterpriseId     | string | 企业id                                                                                                                  |
| enterpriseName   | string | 企业名称                                                                                                                  |
| ystId            | string | 一事通id                                                                                                                 |
| sapId            | string | sapId                                                                                                                 |
| rtcId            | string | rtcId，申请了DevOps工具集的人员具有                                                                                               |
| netEnv           | int    | 登录时所处的网络环境（0：办公网；1：互联网；2：业务网；3：保密网）                                                                                   |
| passedAuthTypes  | string | 已经通过的认证类型以及认证的时间戳（password: 企业账号；verifyCode: 验证码；qrCode: 二维码；faceRecognition: 人脸认证；certLogin: 证书登录；fingerPrint: 指纹登录） |

2.实现单点登录
    通过授权码模式获取的id_Token，应用解析该id_token后获得当前登录用户信息，以实现登录操作，id_token解析示例代码如下：
    id_token为jwt格式，采用国密SM2SignWithSM3签名，验签公钥与示例代码如下：

| 环境   | 公钥        |
| ---- | --------- |
| 测试环境 | 公钥example |
| 生产环境 | 公钥example |

```java
//以下代码基于LC10.02:oauth-client-starter工具包
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.cmb.oa.one.account.oauth.client.algorithm.CMBSM2WithSM3;
import com.cmb.oa.one.account.oauth.client.configuration.AuthProperties;
import com.cmb.oa.one.account.oauth.client.model.OAuthToken;
import com.cmb.oa.one.account.oauth.client.token.TokenHelper;
import com.cmb.oa.one.account.oauth.client.util.JsonUtil;
import com.cmb.oa.one.account.oauth.server.model.ClientInfo;
import org.springframework.stereotype.Service;

@Service
public class OneAccountService {
    private final Algorithm verifyAlgorithm;
    private final TokenHelper tokenHelper;
    private final AuthProperties authProperties;

    public OneAccountService(AuthProperties authProperties, TokenHelper tokenHelper) {
        this.authProperties = authProperties;
        this.verifyAlgorithm = new CMBSM2WithSM3(null, authProperties.getCenterPublicKey());
        this.tokenHelper = tokenHelper;
    }

    public String getUserInfoByAuthCode(final String code) {
        //从统一认证中心获取token
        OAuthToken token = tokenHelper.getTokenByAuthorizationCode(code);
        //token签名校验；时间容差校验，单位为秒，不同服务器可能存在时钟不一致的情况，请合理配置该值
        DecodedJWT decodedJWT = JWT.require(verifyAlgorithm)
                .acceptLeeway(60)
                .build()
                .verify(token.getIdToken());
        // 校验该token是否是一号通颁发给本应用的，防止用其他应用的token来访问本应用
        final ClientInfo clientInfo = JsonUtil.readValue(decodedJWT.getAudience().get(0), ClientInfo.class);
        if (!clientInfo.getId().equals(authProperties.getClientId())) {
            throw new RuntimeException("非本应用token");
        }
        //根据需要获取用户字段信息
        return decodedJWT.getClaim("openId").asString();
    }
}
```

3.调用本平台开放接口，或第三方应用通过本平台发布的接口
    access_token中的aud字段包含了客户端应用信息，可以作为当前客户端的身份标识，调用平台开放接口或第三方应用通过本平台发布的接口。如果需用当前登录用户的身份调用接口则需要使用授权码模式获取的access_token，如果仅以客户端应用的身份调用接口任何方式获取的access_token都可以。

## REFRESH_TOKEN刷新接口

在通过授权码模式获取的token中，如果其access_token已过期则不能在作为调用其他api的认证凭据，此时可以使用refresh_token重新获取一个完整的token对象，refresh_token的超期时间比access_token较长些，如果refresh_token也已经过期，则必须要求用户重新登录才能拿到新的token数据。

### 调用方式

+ TYPE: HTTP

+ URI: `{域名}/auth-server/token?client_id=xxx&grant_type=refresh_token&refresh_token=xxx`

+ METHOD: POST

### 输入参数

+ MODEL: request

| 参数            | 类型     | 必须字段 | 说明                |
| ------------- | ------ | ---- | ----------------- |
| client_id     | string | 是    | 客户端应用32位id        |
| grant_type    | string | 是    | 固定值：refresh_token |
| refresh_token | string | 是    | 从之前获取的token中得到    |

### 输出参数

| 参数            | 类型     | 说明                    |
| ------------- | ------ | --------------------- |
| access_token  | jwt    | 用于后续调用其他接口的凭据         |
| refresh_token | jwt    | 用于刷新access_token      |
| id_token      | jwt    | 用户基本信息                |
| token_type    | string | 固定值：Bearer            |
| expires_in    | number | accessToken的有效期时长，单位秒 |

### 返回码

HTTP协议标准状态码
