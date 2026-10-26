import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { asyncHandler, HttpError, parseId, positiveNumber, requireText } from '../utils.js';
const router=Router(); router.use(requireAuth('manager'));

router.get('/users',asyncHandler(async(req,res)=>{
 const [rows]=await db.execute(`SELECT u.user_id,u.username,u.full_name,u.is_active,u.created_at,r.role_name FROM users u JOIN roles r ON r.role_id=u.role_id ORDER BY u.created_at DESC`);
 res.json(rows.map(x=>({...x,is_active:Boolean(x.is_active)})));
}));
router.post('/users',asyncHandler(async(req,res)=>{
 const username=requireText(req.body?.username,'Username',50); const full_name=requireText(req.body?.full_name,'Full name',100); const password=String(req.body?.password||''); const role=String(req.body?.role||'cashier');
 if(!/^[A-Za-z0-9._-]{3,50}$/.test(username)) throw new HttpError(400,'Username must be 3-50 characters using letters, numbers, dot, underscore or hyphen');
 if(password.length<12||password.length>200) throw new HttpError(400,'Password must be at least 12 characters');
 if(!['manager','cashier'].includes(role)) throw new HttpError(400,'Invalid role');
 const [r]=await db.execute('SELECT role_id FROM roles WHERE role_name=?',[role]); const hash=await bcrypt.hash(password,12);
 const [result]=await db.execute('INSERT INTO users (role_id,username,password_hash,full_name) VALUES (?,?,?,?)',[r[0].role_id,username,hash,full_name]);
 await db.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details,ip_address) VALUES (?,?,?,?,?,?)',[req.user.user_id,'user.create','user',String(result.insertId),JSON.stringify({username,role}),req.ip]);
 res.status(201).json({user_id:result.insertId});
}));
router.patch('/users/:id/active',asyncHandler(async(req,res)=>{
 const id=parseId(req.params.id); if(typeof req.body?.is_active!=='boolean') throw new HttpError(400,'is_active must be boolean');
 if(id===req.user.user_id&&!req.body.is_active) throw new HttpError(400,'You cannot deactivate your own account');
 const [result]=await db.execute('UPDATE users SET is_active=? WHERE user_id=?',[req.body.is_active,id]); if(!result.affectedRows) throw new HttpError(404,'User not found');
 await db.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details,ip_address) VALUES (?,?,?,?,?,?)',[req.user.user_id,'user.active','user',String(id),JSON.stringify({is_active:req.body.is_active}),req.ip]); res.json({updated:true});
}));
router.get('/stock-movements',asyncHandler(async(req,res)=>{
 const [rows]=await db.execute(`SELECT sm.movement_id,i.ingredient_name,i.base_unit,sm.movement_type,sm.quantity_change,sm.note,sm.created_at,u.full_name performed_by,o.order_number FROM stock_movements sm JOIN ingredients i ON i.ingredient_id=sm.ingredient_id JOIN users u ON u.user_id=sm.performed_by LEFT JOIN orders o ON o.order_id=sm.order_id ORDER BY sm.created_at DESC LIMIT 250`); res.json(rows);
}));
router.get('/reports/summary',asyncHandler(async(req,res)=>{
 const from=String(req.query.from||new Date().toISOString().slice(0,10)); const to=String(req.query.to||from);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to) throw new HttpError(400,'Invalid date range');
 const [summary]=await db.execute(`SELECT COUNT(*) order_count,COALESCE(SUM(o.total_amount),0) gross_sales FROM orders o JOIN payments p ON p.order_id=o.order_id AND p.payment_status='paid' WHERE DATE(o.paid_at) BETWEEN ? AND ?`,[from,to]);
 const [topProducts]=await db.execute(`SELECT oi.product_name_snapshot product_name,SUM(oi.quantity) quantity_sold,SUM(oi.line_total) sales FROM order_items oi JOIN orders o ON o.order_id=oi.order_id JOIN payments p ON p.order_id=o.order_id AND p.payment_status='paid' WHERE DATE(o.paid_at) BETWEEN ? AND ? GROUP BY oi.product_id,oi.product_name_snapshot ORDER BY quantity_sold DESC LIMIT 10`,[from,to]);
 res.json({from,to,summary:summary[0],top_products:topProducts,payment_methods:[{payment_method:'cash',count:Number(summary[0].order_count),amount:String(summary[0].gross_sales)}]});
}));
router.post('/refunds',asyncHandler(async(req,res)=>{
 const order_id=parseId(req.body?.order_id); const amount=positiveNumber(req.body?.amount,'Refund amount'); const reason=requireText(req.body?.reason,'Refund reason',255);
 const conn=await db.getConnection();
 try{
  await conn.beginTransaction();
  const [payments]=await conn.execute(`SELECT p.payment_id,p.amount,p.payment_status,o.order_status FROM payments p JOIN orders o ON o.order_id=p.order_id WHERE o.order_id=? FOR UPDATE`,[order_id]);
  if(!payments.length||payments[0].payment_status!=='paid') throw new HttpError(409,'A completed payment was not found for this order');
  const p=payments[0]; const [done]=await conn.execute("SELECT COALESCE(SUM(amount),0) refunded FROM refunds WHERE payment_id=? AND refund_status='completed'",[p.payment_id]);
  if(Number(done[0].refunded)+amount>Number(p.amount)+0.001) throw new HttpError(409,'Refund exceeds the remaining paid amount');
  const [r]=await conn.execute("INSERT INTO refunds (payment_id,amount,reason,processed_by,refund_status,processed_at) VALUES (?,?,?,?,'completed',CURRENT_TIMESTAMP)",[p.payment_id,amount.toFixed(2),reason,req.user.user_id]);
  const [total]=await conn.execute("SELECT COALESCE(SUM(amount),0) refunded FROM refunds WHERE payment_id=? AND refund_status='completed'",[p.payment_id]);
  if(Number(total[0].refunded)+0.001>=Number(p.amount)) await conn.execute("UPDATE payments SET payment_status='voided' WHERE payment_id=?",[p.payment_id]);
  await conn.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details,ip_address) VALUES (?,?,?,?,?,?)',[req.user.user_id,'refund.complete','order',String(order_id),JSON.stringify({amount,reason,refund_id:r.insertId}),req.ip]);
  await conn.commit();res.status(201).json({refund_id:r.insertId,amount:amount.toFixed(2)});
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));
export default router;
