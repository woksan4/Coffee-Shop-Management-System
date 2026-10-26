import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import orderRoutes from './routes/orders.js';
import managementRoutes from './routes/management.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Startup blocked: set JWT_SECRET to a random value of at least 32 characters in backend/.env');
  process.exit(1);
}
const app=express();
app.disable('x-powered-by');
app.use(helmet());
const allowed=(process.env.CORS_ORIGIN||'http://localhost:5173').split(',').map(x=>x.trim());
app.use(cors({origin(origin,cb){if(!origin||allowed.includes(origin)) return cb(null,true); return cb(new Error('Origin not allowed'));}}));
app.use(express.json({limit:'100kb'}));
app.get('/api/health',(req,res)=>res.json({status:'ok'}));
app.use('/api',authRoutes);
app.use('/api',catalogRoutes);
app.use('/api/orders',orderRoutes);
app.use('/api/management',managementRoutes);
app.use((req,res)=>res.status(404).json({error:'Route not found'}));
app.use((err,req,res,next)=>{
 if(err.type==='entity.parse.failed') return res.status(400).json({error:'Invalid JSON body'});
 if(err.status) return res.status(err.status).json({error:err.message});
 if(err.code==='ER_DUP_ENTRY') return res.status(409).json({error:'A record with the same unique value already exists'});
 if(err.code==='ER_NO_REFERENCED_ROW_2') return res.status(400).json({error:'Invalid reference'});
 if(err.message==='Origin not allowed') return res.status(403).json({error:'Origin not allowed'});
 console.error(err); return res.status(500).json({error:'Internal server error'});
});
const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log(`Coffee Shop API listening on http://localhost:${port}`));
