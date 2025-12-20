/**
 * dayjs 配置
 * 配置本地化，确保时间显示正确
 * 
 * 后端 Django 使用 USE_TZ=False 和 TIME_ZONE='Asia/Shanghai'
 * 数据库直接存储本地时间，无需时区转换
 */
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 设置中文 locale
dayjs.locale('zh-cn');

// 导出配置好的 dayjs
export default dayjs;

