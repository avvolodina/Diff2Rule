-- "d2r-v1.0".tq_ddl_history definition

-- Drop table

-- DROP TABLE "d2r-v1.0".tq_ddl_history;

CREATE TABLE "d2r-v1.0".tq_ddl_history (
	id serial4 NOT NULL,
	tq_id int4 NOT NULL,
	ddl_json json NOT NULL,
	created_ts timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tq_ddl_history_pkey PRIMARY KEY (id),
	CONSTRAINT tq_ddl_history_tq_id_fkey FOREIGN KEY (tq_id) REFERENCES "d2r-v1.0".target_query(id)
);