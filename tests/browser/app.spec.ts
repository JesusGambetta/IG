import {test,expect} from '@playwright/test';
import {ACCOUNTS,closeWeek,period,type Store} from '../../src/core';
// Synthetic records exist ONLY in intercepted test responses, never in delivered JSON.
function fixture():Store & {generatedAt:string}{
  const s:Store={version:1,initializedAt:'2026-10-19T03:00:00Z',measurements:[],attempts:[],weeks:[]};
  ACCOUNTS.forEach((a,i)=>s.measurements.push({account:a.id,value:1000,at:'2026-10-19T02:00:00Z',approximate:false,source:'manual',evidence:'TEST ONLY'},{account:a.id,value:1000+(5-i)*100,at:'2026-10-25T23:45:00Z',approximate:false,source:'manual',evidence:'TEST ONLY'}));
  s.weeks.push(closeWeek(s,period('2026-10-21T12:00:00Z'),Date.parse('2026-10-26T00:00:00Z')));return {...s,generatedAt:'2026-10-26T00:00:00Z'};
}
test('dashboard real carga sin errores y sin mediciones inventadas',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');
  await expect(page.getByRole('heading',{name:'Cada seguidor cuenta. El domingo se define.'})).toBeVisible();
  await expect(page.locator('.account-card')).toHaveCount(5);await expect(page.getByText('Actualización del sitio:')).not.toContainText('cargando');
  expect(errors).toEqual([]);
});
test('overlay transparente por ruta física y variante compacta',async({page})=>{
  await page.goto('overlay/?compact=1');await expect(page.locator('.overlay.compact')).toBeVisible();
  expect(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('.topbar')).toHaveCount(0);
});
test('revelación de último a primero, ganador y repetición',async({page})=>{
  await page.clock.install({time:new Date('2026-10-26T00:10:00Z')});
  await page.route('**/data/dashboard.json*',r=>r.fulfill({json:fixture()}));await page.goto('overlay/');
  await page.clock.runFor(700);await expect(page.locator('.medal-5')).toHaveClass(/shown/);await expect(page.locator('.medal-1')).toHaveClass(/hidden-row/);
  await page.clock.runFor(6000);await expect(page.locator('.winner')).toContainText('GANADOR');
  await page.getByRole('button',{name:'Repetir revelación'}).click();await expect(page.locator('.medal-1')).toHaveClass(/hidden-row/);
});
test('oculta resultados futuros incluso si aparecen en JSON',async({page})=>{
  await page.clock.install({time:new Date('2026-10-25T23:59:00Z')});await page.route('**/data/dashboard.json*',r=>r.fulfill({json:fixture()}));await page.goto('./');
  await expect(page.getByText('El podio todavía está reservado')).toBeVisible();await expect(page.locator('.rank-row')).toHaveCount(0);
});
test('comparación interactiva e historial; responsive sin desborde',async({page})=>{
  await page.clock.install({time:new Date('2026-10-26T00:10:00Z')});await page.route('**/data/dashboard.json*',r=>r.fulfill({json:fixture()}));await page.goto('./');
  await expect(page.locator('.recharts-line')).toHaveCount(5);await page.getByRole('button',{name:'Juan Fabiani',exact:true}).click();await expect(page.locator('.recharts-line')).toHaveCount(4);
  await page.getByLabel('Métrica').selectOption('growth');await page.getByLabel('Período',{exact:true}).selectOption('90');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
