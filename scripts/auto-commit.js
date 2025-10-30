#!/usr/bin/env node

/**
 * Автоматический коммит и пуш изменений
 * Использование: node scripts/auto-commit.js "commit message"
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, description) {
    try {
        console.log(`🔄 ${description}...`);
        const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        console.log(`✅ ${description} завершено`);
        return result.trim();
    } catch (error) {
        console.error(`❌ Ошибка при ${description.toLowerCase()}:`, error.message);
        throw error;
    }
}

function hasChanges() {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim().length > 0;
}

function getStagedChanges() {
    try {
        const staged = execSync('git diff --cached --name-status', { encoding: 'utf8' });
        return staged.trim();
    } catch (error) {
        return '';
    }
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('❌ Ошибка: Укажите сообщение коммита');
        console.log('Использование: node scripts/auto-commit.js "Ваше сообщение"');
        console.log('');
        console.log('Примеры:');
        console.log('  node scripts/auto-commit.js "feat: add search functionality"');
        console.log('  node scripts/auto-commit.js "fix: resolve login issue"');
        console.log('  node scripts/auto-commit.js "docs: update README"');
        process.exit(1);
    }

    const commitMessage = args.join(' ');

    try {
        console.log('🚀 Начинаем автоматический коммит и пуш...\n');

        // Проверка наличия изменений
        if (!hasChanges()) {
            console.log('ℹ️  Нет изменений для коммита');
            return;
        }

        // Добавление файлов
        runCommand('git add .', 'Добавление файлов в индекс');

        // Проверка staged изменений
        const stagedChanges = getStagedChanges();
        if (!stagedChanges) {
            console.log('ℹ️  Нет изменений для коммита после добавления');
            return;
        }

        console.log('📝 Изменения для коммита:');
        console.log(stagedChanges);
        console.log('');

        // Создание коммита
        runCommand(`git commit -m "${commitMessage}"`, `Создание коммита "${commitMessage}"`);

        // Получение информации о коммите
        const commitHash = runCommand('git rev-parse HEAD', 'Получение хэша коммита');
        console.log(`📋 Коммит: ${commitHash.substring(0, 8)}\n`);

        // Пуш в удаленный репозиторий
        try {
            runCommand('git push origin main', 'Пуш в GitHub');
            console.log('✅ Изменения успешно запушены!');
            console.log(`🔗 Посмотреть изменения: https://github.com/ggavr/flatswithcats/commit/${commitHash}`);
        } catch (pushError) {
            console.error('❌ Ошибка при пуше. Возможные решения:');
            console.log('');
            console.log('🔐 Аутентификация:');
            console.log('  • Убедитесь, что настроен Personal Access Token в Git');
            console.log('  • Или используйте SSH: git remote set-url origin git@github.com:ggavr/flatswithcats.git');
            console.log('');
            console.log('🔍 Диагностика:');
            console.log('  • Проверьте права доступа к репозиторию');
            console.log('  • Попробуйте: git remote -v');
            console.log('  • Или: ssh -T git@github.com');
            console.log('');
            throw pushError;
        }

    } catch (error) {
        console.error('\n💥 Процесс прерван из-за ошибки');
        process.exit(1);
    }
}

// Запуск скрипта
if (require.main === module) {
    main();
}

module.exports = { main, hasChanges, runCommand };
