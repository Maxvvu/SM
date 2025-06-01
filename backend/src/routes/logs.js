const express = require("express");
const { authenticateToken, isAdmin } = require("../middleware/auth");
const { logger } = require("../utils/logger");

const router = express.Router();

// 获取操作日志
router.get("/", authenticateToken, isAdmin, async (req, res, next) => {
  try {

    const { page = 1, pageSize = 10, type, startDate, endDate } = req.query;
    
    const result = await logger.getOperationLogs({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      type,
      startDate,
      endDate
    });

    res.json(result);
  } catch (err) {

    next(err);
  }
});

// 批量删除日志
router.delete("/batch", authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "请选择要删除的日志" });
    }

    const result = await logger.deleteOperationLogs(ids);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 清除日志
router.delete("/", authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { type } = req.query;

    const logPath = path.join(__dirname, "../../logs/combined.log");
    const errorLogPath = path.join(__dirname, "../../logs/error.log");

    if (!type || type === "all") {
      // 清除所有日志
      await ensureFileExists(logPath);
      await ensureFileExists(errorLogPath);
      await fs.writeFile(logPath, "");
      await fs.writeFile(errorLogPath, "");
    } else if (type === "error") {
      // 只清除错误日志
      await ensureFileExists(errorLogPath);
      await fs.writeFile(errorLogPath, "");
    } else if (type === "info") {
      // 只清除普通日志
      await ensureFileExists(logPath);
      await fs.writeFile(logPath, "");
    }

    res.json({ message: "日志清除成功" });
  } catch (err) {
    next(err);
  }
});

// 辅助函数：检查文件是否存在
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 辅助函数：确保文件存在
async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    // 如果文件不存在，创建一个空文件
    await fs.writeFile(filePath, "");
  }
}

module.exports = router;
