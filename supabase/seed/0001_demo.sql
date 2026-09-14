-- Subpar OS deterministic synthetic seed
-- SAFE: contains no real customer data. Intended only to prove the Supabase adapter before live-data approval.

begin;

-- Remove only the deterministic synthetic graph so this seed can be re-run safely.
delete from events where project_id in (select id from tune_projects where metadata->>'seed' = 'subpar-demo-v1');
delete from messages where project_id in (select id from tune_projects where metadata->>'seed' = 'subpar-demo-v1');
delete from conversations where project_id in (select id from tune_projects where metadata->>'seed' = 'subpar-demo-v1');
delete from files where project_id in (select id from tune_projects where metadata->>'seed' = 'subpar-demo-v1');
delete from logs where project_id in (select id from tune_projects where metadata->>'seed' = 'subpar-demo-v1');
delete from revisions where project_id in (select id from tune_projects where metadata->>'seed' = 'subpar-demo-v1');
delete from project_requirements where project_id in (select id from tune_projects where metadata->>'seed' = 'subpar-demo-v1');
delete from tune_projects where metadata->>'seed' = 'subpar-demo-v1';
delete from orders where raw_payload->>'seed' = 'subpar-demo-v1';
delete from vehicles where notes = 'subpar-demo-v1';
delete from customers where metadata->>'seed' = 'subpar-demo-v1';

insert into customers (id,email,first_name,last_name,source,metadata) values
('10000000-0000-4000-8000-000000000001','alex.rivera@example.com','Alex','Rivera','demo','{"seed":"subpar-demo-v1"}'),
('10000000-0000-4000-8000-000000000002','mike.tremblay@example.com','Mike','Tremblay','demo','{"seed":"subpar-demo-v1"}'),
('10000000-0000-4000-8000-000000000003','ryan.gallagher@example.com','Ryan','Gallagher','demo','{"seed":"subpar-demo-v1"}'),
('10000000-0000-4000-8000-000000000004','sarah.chen@example.com','Sarah','Chen','demo','{"seed":"subpar-demo-v1"}'),
('10000000-0000-4000-8000-000000000005','tyler.brooks@example.com','Tyler','Brooks','demo','{"seed":"subpar-demo-v1"}'),
('10000000-0000-4000-8000-000000000006','carlos.mendez@example.com','Carlos','Mendez','demo','{"seed":"subpar-demo-v1"}'),
('10000000-0000-4000-8000-000000000007','jordan.patel@example.com','Jordan','Patel','demo','{"seed":"subpar-demo-v1"}'),
('10000000-0000-4000-8000-000000000008','brandon.cole@example.com','Brandon','Cole','demo','{"seed":"subpar-demo-v1"}');

insert into vehicles (id,customer_id,year,make,model,chassis,engine,transmission,current_fuel,notes) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',2021,'BMW','M340i','G20','B58TU','ZF8','E40','subpar-demo-v1'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',2019,'BMW','M2 Competition','F87','S55','DCT','93','subpar-demo-v1'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003',2022,'BMW','M3 Competition','G80','S58','ZF8','E50','subpar-demo-v1'),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004',2020,'Toyota','GR Supra 3.0','A90','B58','ZF8','93','subpar-demo-v1'),
('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000005',2015,'BMW','335i xDrive','F30','N55','ZF8','E30','subpar-demo-v1'),
('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000006',2016,'BMW','M4','F82','S55','DCT','93','subpar-demo-v1'),
('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000007',2024,'BMW','M2','G87','S58','ZF8','E50','subpar-demo-v1'),
('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000008',2023,'BMW','X3 M40i','G01','B58TU','ZF8','E35','subpar-demo-v1');

insert into orders (id,customer_id,vehicle_id,external_source,external_order_id,product_name,amount_cents,currency,payment_status,raw_payload,ordered_at) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','wix','SP-1842','B58TU Custom Tune',65000,'USD','paid','{"seed":"subpar-demo-v1"}',now()-interval '5 days'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','wix','SP-1839','S55 Custom Tune',75000,'USD','paid','{"seed":"subpar-demo-v1"}',now()-interval '6 days'),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','wix','SP-1834','S58 Custom Tune',85000,'USD','paid','{"seed":"subpar-demo-v1"}',now()-interval '7 days'),
('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','wix','SP-1830','B58 Custom Tune',65000,'USD','paid','{"seed":"subpar-demo-v1"}',now()-interval '8 days'),
('30000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000005','wix','SP-1827','N55 Custom Tune',55000,'USD','paid','{"seed":"subpar-demo-v1"}',now()-interval '9 days'),
('30000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000006','wix','SP-1846','S55 Custom Tune',75000,'USD','paid','{"seed":"subpar-demo-v1"}',now()-interval '2 hours'),
('30000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000007','wix','SP-1845','S58 Custom Tune',85000,'USD','paid','{"seed":"subpar-demo-v1"}',now()-interval '1 day'),
('30000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000008','wix','SP-1822','B58TU Custom Tune',65000,'USD','paid','{"seed":"subpar-demo-v1"}',now()-interval '10 days');

insert into tune_projects (id,project_number,customer_id,vehicle_id,order_id,platform,fuel_target,status,stage,priority,waiting_on,next_action,current_revision_number,customer_visible_status,metadata) values
('40000000-0000-4000-8000-000000000001','SP-1842','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','MHD','E40','Log Uploaded','log_review','high','tuner','Review 2 new MHD logs',4,'Logs received — tuner review in progress','{"seed":"subpar-demo-v1"}'),
('40000000-0000-4000-8000-000000000002','SP-1839','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','BM3','93','Revision in Progress','revision','high','tuner','Finish Rev 2',2,'Revision in progress','{"seed":"subpar-demo-v1"}'),
('40000000-0000-4000-8000-000000000003','SP-1834','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','EcuTek','E50','Ready to Deliver','delivery','medium','tuner','Send customer update',5,'Revision ready for delivery','{"seed":"subpar-demo-v1"}'),
('40000000-0000-4000-8000-000000000004','SP-1830','10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004','MHD','93','Waiting on Customer','waiting_customer','medium','customer','Waiting for pull',2,'Waiting for your datalog','{"seed":"subpar-demo-v1"}'),
('40000000-0000-4000-8000-000000000005','SP-1827','10000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000005','MHD','E30','Compatibility Review','compatibility','low','tuner','Review ROM details',4,'Compatibility review','{"seed":"subpar-demo-v1"}'),
('40000000-0000-4000-8000-000000000006','SP-1846','10000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000006','BM3','93','New Order','intake','high','customer','Send intake',1,'Vehicle intake needed','{"seed":"subpar-demo-v1"}'),
('40000000-0000-4000-8000-000000000007','SP-1845','10000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000007','EcuTek','E50','Vehicle Info Received','compatibility','medium','tuner','Review intake',1,'Intake received','{"seed":"subpar-demo-v1"}'),
('40000000-0000-4000-8000-000000000008','SP-1822','10000000-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000008','MHD','E35','Log Uploaded','log_review','high','tuner','Review HPFP trace',3,'Logs received — tuner review in progress','{"seed":"subpar-demo-v1"}');

insert into project_requirements (id,project_id,requirement_type,label,status,customer_visible,required,completed_at) values
('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','vehicle_intake','Vehicle intake','complete',true,true,now()-interval '5 days'),
('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','stock_file','MHD stock file','complete',true,true,now()-interval '5 days'),
('50000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001','parameter_pack','B58TU logging parameter pack','complete',true,true,now()-interval '4 days'),
('50000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000001','baseline_log','Baseline datalog','complete',true,true,now()-interval '4 days'),
('50000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000001','log_review','Rev 4 log review','pending',true,true,null);

insert into revisions (id,project_id,revision_number,status,fuel_target,customer_summary,internal_notes,published_at) values
('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1,'superseded','E40','Initial calibration','Synthetic seed revision',now()-interval '4 days'),
('60000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001',2,'superseded','E40','Boost and fueling refinement','Synthetic seed revision',now()-interval '3 days'),
('60000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001',3,'superseded','E40','Part-throttle and spool refinement','Synthetic seed revision',now()-interval '2 days'),
('60000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000001',4,'delivered','E40','Smoother torque delivery and refined boost control.','Review small cylinder 4 correction near 5700 RPM; fuel pressure healthy.',now()-interval '1 day');

insert into logs (id,project_id,revision_id,platform,source,file_name,status,gear,fuel,metrics,flags,parser_version,uploaded_at) values
('70000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000004','MHD','upload','rev4_pull_01.csv','needs_review',3,'E40','{"boostTargetPsi":24.0,"boostActualPsi":24.3,"lambda":0.81,"timingCorrectionDeg":-1.5,"hpfpMinPsi":2570,"iatPeakF":118,"throttleClosure":false}','["small_cyl4_correction"]','seed-v1',now()-interval '20 minutes'),
('70000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000004','MHD','upload','rev4_pull_02.csv','needs_review',3,'E40','{"boostTargetPsi":24.0,"boostActualPsi":24.1,"lambda":0.80,"timingCorrectionDeg":-1.2,"hpfpMinPsi":2610,"iatPeakF":116,"throttleClosure":false}','[]','seed-v1',now()-interval '18 minutes');

insert into conversations (id,project_id,customer_id,channel,external_thread_id,subject) values
('80000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','gmail','demo-thread-sp1842','Rev 4 logs uploaded');

insert into messages (id,conversation_id,project_id,external_message_id,direction,sender,recipient,subject,body_text,customer_visible,received_at) values
('90000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','demo-msg-1','inbound','alex.rivera@example.com','doug@subpartuning.com','Rev 4 logs uploaded','Car feels much smoother on this revision. I just uploaded two fresh pulls.',true,now()-interval '18 minutes');

insert into events (id,project_id,customer_id,vehicle_id,event_type,actor_type,visibility,payload,idempotency_key,created_at) values
('a0000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','log.uploaded','customer','both','{"count":2,"platform":"MHD","seed":"subpar-demo-v1"}','demo:sp1842:logs:rev4',now()-interval '18 minutes'),
('a0000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000006','order.paid','system','internal','{"source":"wix","seed":"subpar-demo-v1"}','demo:sp1846:order-paid',now()-interval '2 hours');

commit;
