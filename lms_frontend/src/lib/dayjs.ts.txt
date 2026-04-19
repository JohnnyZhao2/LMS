/**
 * dayjs 配置
 * 配置中文本地化
 * 
 * 后端 Django 使用 USE_TZ=True，返回带时区的 ISO 8601 格式
 * dayjs 会自动解析并转换为本地时间显示
 */
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 设置中文 locale
dayjs.locale('zh-cn');

// 导出配置好的 dayjs
export default dayjs;


