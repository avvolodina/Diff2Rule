-- "d2r-v1.0"."run" definition

-- Drop table

-- DROP TABLE "d2r-v1.0"."run";

CREATE TABLE "d2r-v1.0"."run" (
	id serial4 NOT NULL,
	rs_id int4 NOT NULL,
	args jsonb NULL,
	"label" varchar(255) NULL,
	notes text NULL,
	results jsonb NULL,
	status varchar(100) NULL,
	complete_ts timestamp NULL, 
	CONSTRAINT run_pkey PRIMARY KEY (id),
	CONSTRAINT run_rs_id_fkey FOREIGN KEY (rs_id) REFERENCES "d2r-v1.0".rule_set(id)
);
