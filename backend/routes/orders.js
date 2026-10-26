import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { asyncHandler, HttpError, parseId, positiveNumber, requireText } from '../utils.js';

const router=Router();
router.use(requireAuth('manager','cashier'));

function cleanLines(input){
  if(!Array.isArray(input)||input.length<1||input.length>30) throw new HttpError(400,'An order must contain 1 to 30 product lines');
  const lines=input.map(x=>({product_id:parseId(x.product_id),quantity:Number(x.quantity)}));
  if(lines.some(x=>!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>99)) throw new HttpError(400,'Each quantity must be a whole number between 1 and 99');
  const combined=new Map(); for(const line of lines) combined.set(line.product_id,(combined.get(line.product_id)||0)+line.quantity);
  return [...combined.entries()].map(([product_id,quantity])=>({product_id,quantity}));
}
async function checkAvailability(lines, executor=db){
  const ids=lines.map(x=>x.product_id);
  const [products]=await executor.query(`SELECT product_id,product_name,selling_price,is_available,is_active FROM products WHERE product_id IN (${ids.map(()=>'?').join(',')})`,ids);
  const pmap=new Map(products.map(p=>[Number(p.product_id),p]));
  const resolved=[]; const required=new Map();
  for(const line of lines){
    const p=pmap.get(line.product_id);
    if(!p||!p.is_active||!p.is_available) throw new HttpError(409,`Product ${line.product_id} is unavailable. Remove it or update availability.`);
    const [recipe]=await executor.execute('SELECT recipe_id FROM recipes WHERE product_id=?',[p.product_id]);
    if(!recipe.length) throw new HttpError(409,`No recipe is configured for ${p.product_name}. Ask the manager to configure it.`);
    const [items]=await executor.execute(
      `SELECT ri.ingredient_id,i.ingredient_name,i.base_unit,ri.quantity_required,COALESCE(v.quantity_on_hand,0) quantity_on_hand
       FROM recipe_items ri JOIN ingredients i ON i.ingredient_id=ri.ingredient_id
       LEFT JOIN inventory v ON v.ingredient_id=i.ingredient_id WHERE ri.recipe_id=?`,[recipe[0].recipe_id]);
    if(!items.length) throw new HttpError(409,`No ingredients are configured for ${p.product_name}.`);
    for(const it of items){
      const ingredientId=Number(it.ingredient_id);
      const prev=required.get(ingredientId)||{ingredient_id:ingredientId,ingredient_name:it.ingredient_name,unit:it.base_unit,needed:0,available:Number(it.quantity_on_hand)};
      prev.needed+=Number(it.quantity_required)*line.quantity;
      required.set(ingredientId,prev);
    }
    resolved.push({ ...line, product:p, recipe_id:recipe[0].recipe_id, ingredients:items });
  }
  const shortages=[...required.values()].filter(x=>x.available+0.000001<x.needed).map(x=>({...x,shortage:x.needed-x.available}));
  return {resolved,shortages};
}
router.post('/check-stock',asyncHandler(async(req,res)=>{
  const lines=cleanLines(req.body?.items); const result=await checkAvailability(lines);
  res.json({available:result.shortages.length===0,shortages:result.shortages,items:result.resolved.map(x=>({product_id:x.product_id,product_name:x.product.product_name,quantity:x.quantity,unit_price:x.product.selling_price,line_total:(Number(x.product.selling_price)*x.quantity).toFixed(2)})),total:result.resolved.reduce((sum,x)=>sum+Number(x.product.selling_price)*x.quantity,0).toFixed(2)});
}));

// Confirm cash sale: stock is rechecked and order/payment/stock are committed atomically.
router.post('/sale',asyncHandler(async(req,res)=>{
  const lines=cleanLines(req.body?.items);
  const idempotencyKey=String(req.get('Idempotency-Key')||'').trim();
  if(!idempotencyKey||idempotencyKey.length>100) throw new HttpError(400,'A unique Idempotency-Key is required for sale confirmation');
  const conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    // An identical retry returns the existing sale instead of charging or deducting stock twice.
    const [existingSale]=await conn.execute('SELECT order_id,order_number,total_amount,order_status,paid_at FROM orders WHERE idempotency_key=? FOR UPDATE',[idempotencyKey]);
    if(existingSale.length){
      await conn.commit();
      return res.status(200).json({order_id:existingSale[0].order_id,order_number:existingSale[0].order_number,total:String(existingSale[0].total_amount),payment_status:'paid',order_status:existingSale[0].order_status,created_at:existingSale[0].paid_at,idempotent_replay:true});
    }
    // Lock inventory rows in deterministic order to prevent concurrent overselling.
    const ids=lines.map(x=>x.product_id);
    const [products]=await conn.query(`SELECT product_id,product_name,selling_price,is_available,is_active FROM products WHERE product_id IN (${ids.map(()=>'?').join(',')}) ORDER BY product_id FOR UPDATE`,ids);
    if(products.length!==ids.length) throw new HttpError(409,'One or more products no longer exist');
    const pmap=new Map(products.map(p=>[Number(p.product_id),p]));
    const resolved=[];
    for(const line of lines){
      const p=pmap.get(line.product_id);
      if(!p.is_active||!p.is_available) throw new HttpError(409,`${p.product_name} is unavailable. Adjust the order before payment.`);
      const [recipe]=await conn.execute('SELECT recipe_id FROM recipes WHERE product_id=?',[p.product_id]);
      if(!recipe.length) throw new HttpError(409,`No recipe is configured for ${p.product_name}`);
      const [items]=await conn.execute(
        `SELECT ri.ingredient_id,i.ingredient_name,i.base_unit,ri.quantity_required,v.quantity_on_hand
         FROM recipe_items ri JOIN ingredients i ON i.ingredient_id=ri.ingredient_id
         JOIN inventory v ON v.ingredient_id=i.ingredient_id WHERE ri.recipe_id=? ORDER BY ri.ingredient_id FOR UPDATE`,[recipe[0].recipe_id]);
      if(!items.length) throw new HttpError(409,`No ingredients are configured for ${p.product_name}`);
      resolved.push({...line,product:p,recipe_id:recipe[0].recipe_id,ingredients:items});
    }
    const required=new Map();
    for(const line of resolved) for(const it of line.ingredients){
      const prev=required.get(Number(it.ingredient_id))||{ingredient_id:Number(it.ingredient_id),name:it.ingredient_name,unit:it.base_unit,needed:0,available:Number(it.quantity_on_hand)};
      prev.needed+=Number(it.quantity_required)*line.quantity; required.set(prev.ingredient_id,prev);
    }
    const shortages=[...required.values()].filter(x=>x.available+0.000001<x.needed).map(x=>({...x,shortage:x.needed-x.available}));
    if(shortages.length) throw new HttpError(409,`Insufficient ingredients: ${shortages.map(x=>`${x.name} (need ${x.needed.toFixed(3)} ${x.unit}, available ${x.available.toFixed(3)} ${x.unit})`).join('; ')}`);
    const total=resolved.reduce((sum,x)=>sum+Number(x.product.selling_price)*x.quantity,0);
    const orderNumber=`CS-${new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14)}-${randomUUID().slice(0,6).toUpperCase()}`;
    const [orderResult]=await conn.execute(
      `INSERT INTO orders (order_number,idempotency_key,cashier_id,order_status,subtotal,total_amount,paid_at) VALUES (?,?,?, 'received',?,?,CURRENT_TIMESTAMP)`,
      [orderNumber,idempotencyKey,req.user.user_id,total.toFixed(2),total.toFixed(2)]);
    const orderId=orderResult.insertId;
    for(const line of resolved){
      const price=Number(line.product.selling_price); const lineTotal=price*line.quantity;
      const [itemResult]=await conn.execute(
        `INSERT INTO order_items (order_id,product_id,recipe_id,product_name_snapshot,quantity,unit_price,line_total) VALUES (?,?,?,?,?,?,?)`,
        [orderId,line.product.product_id,line.recipe_id,line.product.product_name,line.quantity,price.toFixed(2),lineTotal.toFixed(2)]);
      for(const it of line.ingredients){
        const used=Number(it.quantity_required)*line.quantity;
        await conn.execute(
          `INSERT INTO order_item_ingredients (order_item_id,ingredient_id,ingredient_name_snapshot,base_unit_snapshot,quantity_used) VALUES (?,?,?,?,?)`,
          [itemResult.insertId,it.ingredient_id,it.ingredient_name,it.base_unit,used.toFixed(3)]);
      }
    }
    const [paymentResult]=await conn.execute(
      `INSERT INTO payments (order_id,amount,payment_status,received_by,paid_at) VALUES (?,?,'paid',?,CURRENT_TIMESTAMP)`,
      [orderId,total.toFixed(2),req.user.user_id]);
    for(const [ingredientId,item] of required){
      const next=item.available-item.needed;
      await conn.execute('UPDATE inventory SET quantity_on_hand=? WHERE ingredient_id=?',[Math.max(0,next).toFixed(3),ingredientId]);
      await conn.execute(
        `INSERT INTO stock_movements (ingredient_id,order_id,movement_type,quantity_change,performed_by,note) VALUES (?,?,'sale',?,?,?)`,
        [ingredientId,orderId,(-item.needed).toFixed(3),req.user.user_id,`Sale ${orderNumber}`]);
    }
    await conn.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details,ip_address) VALUES (?,?,?,?,?,?)',
      [req.user.user_id,'sale.confirm','order',String(orderId),JSON.stringify({order_number:orderNumber,total,payment_id:paymentResult.insertId,idempotency_key:idempotencyKey}),req.ip]);
    await conn.commit();
    res.status(201).json({order_id:orderId,order_number:orderNumber,total:total.toFixed(2),payment_status:'paid',order_status:'received',created_at:new Date().toISOString()});
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));

router.get('/',asyncHandler(async(req,res)=>{
  const from=String(req.query.from||'').slice(0,10); const to=String(req.query.to||'').slice(0,10);
  const clauses=[]; const params=[];
  if(from){if(!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new HttpError(400,'Invalid from date');clauses.push('DATE(o.created_at)>=?');params.push(from);}
  if(to){if(!/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new HttpError(400,'Invalid to date');clauses.push('DATE(o.created_at)<=?');params.push(to);}
  const where=clauses.length?'WHERE '+clauses.join(' AND '):'';
  const [rows]=await db.execute(
    `SELECT o.order_id,o.order_number,o.order_status,o.total_amount,o.created_at,o.paid_at,
      u.full_name AS cashier_name,p.payment_status,
      (SELECT GROUP_CONCAT(CONCAT(oi.product_name_snapshot,' x',oi.quantity) ORDER BY oi.order_item_id SEPARATOR ', ') FROM order_items oi WHERE oi.order_id=o.order_id) items
     FROM orders o JOIN users u ON u.user_id=o.cashier_id LEFT JOIN payments p ON p.order_id=o.order_id ${where}
     ORDER BY o.created_at DESC LIMIT 200`,params);
  res.json(rows);
}));
router.get('/:id/receipt',asyncHandler(async(req,res)=>{
  const id=parseId(req.params.id);
  const [orders]=await db.execute(`SELECT o.*,u.full_name cashier_name,p.payment_status,p.payment_method FROM orders o JOIN users u ON u.user_id=o.cashier_id LEFT JOIN payments p ON p.order_id=o.order_id WHERE o.order_id=?`,[id]);
  if(!orders.length) throw new HttpError(404,'Order not found');
  const [items]=await db.execute('SELECT product_name_snapshot,quantity,unit_price,line_total FROM order_items WHERE order_id=? ORDER BY order_item_id',[id]);
  res.json({order:orders[0],items});
}));
router.patch('/:id/status',asyncHandler(async(req,res)=>{
  const id=parseId(req.params.id); const next=String(req.body?.status||'');
  const transitions={received:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['completed','cancelled']};
  if(!Object.hasOwn(transitions, next) && !['preparing','ready','completed','cancelled'].includes(next)) throw new HttpError(400,'Invalid order status');
  const conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const [rows]=await conn.execute('SELECT order_status FROM orders WHERE order_id=? FOR UPDATE',[id]);
    if(!rows.length) throw new HttpError(404,'Order not found');
    const current=rows[0].order_status;
    if(!(transitions[current]||[]).includes(next)) throw new HttpError(409,`Cannot move order from ${current} to ${next}`);
    if(next==='cancelled'){
      const reason=requireText(req.body?.reason,'Cancellation reason',255);
      await conn.execute('UPDATE orders SET order_status=?,cancelled_at=CURRENT_TIMESTAMP,cancelled_by=?,cancellation_reason=? WHERE order_id=?',[next,req.user.user_id,reason,id]);
      // If cancelled before preparation starts, return ingredients to stock. Once preparation has begun, stock is not automatically restored.
      if(current==='received'){
        const [used]=await conn.execute(`SELECT ingredient_id, SUM(quantity_used) quantity_used FROM order_item_ingredients oiig JOIN order_items oi ON oi.order_item_id=oiig.order_item_id WHERE oi.order_id=? GROUP BY ingredient_id ORDER BY ingredient_id`,[id]);
        for(const item of used){
          await conn.execute('UPDATE inventory SET quantity_on_hand=quantity_on_hand+? WHERE ingredient_id=?',[Number(item.quantity_used).toFixed(3),item.ingredient_id]);
          await conn.execute(`INSERT INTO stock_movements (ingredient_id,order_id,movement_type,quantity_change,performed_by,note) VALUES (?,?,'reversal',?,?,?)`,[item.ingredient_id,id,Number(item.quantity_used).toFixed(3),req.user.user_id,`Cancelled before preparation: order ${id}`]);
        }
      }
      // Payment is not silently reversed; a manager must record a refund separately.
    } else await conn.execute('UPDATE orders SET order_status=? WHERE order_id=?',[next,id]);
    await conn.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details,ip_address) VALUES (?,?,?,?,?,?)',[req.user.user_id,'order.status','order',String(id),JSON.stringify({from:current,to:next,reason:req.body?.reason||null}),req.ip]);
    await conn.commit();res.json({order_id:id,order_status:next});
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));
export default router;
